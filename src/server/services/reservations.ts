import "server-only";
import type Stripe from "stripe";
import type { Prisma } from "@/generated/prisma/client";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { decimalToNumber, toMinorUnits } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { referenceCode } from "@/lib/slug";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";
import { audit } from "@/server/services/audit";
import { notify } from "@/server/services/notifications";
import type { ReservationDTO } from "@/types/dto";

const reservationInclude = {
  property: { select: { id: true, slug: true, title: true, price: true, listingType: true, images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } } } },
  buyer: { select: { id: true, name: true, image: true, role: true } },
  seller: { select: { id: true, name: true, image: true, role: true } },
  offer: { select: { id: true, amount: true, counterAmount: true } },
  payments: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.ReservationInclude;

type ReservationRow = Prisma.ReservationGetPayload<{ include: typeof reservationInclude }>;

export function toReservationDTO(row: ReservationRow): ReservationDTO {
  return {
    id: row.id,
    reference: row.reference,
    depositAmount: decimalToNumber(row.depositAmount),
    currency: row.currency,
    status: row.status,
    paidAt: row.paidAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    property: {
      id: row.property.id,
      slug: row.property.slug,
      title: row.property.title,
      coverImage: row.property.images[0]?.url ?? null,
      price: decimalToNumber(row.property.price),
      listingType: row.property.listingType,
    },
    buyer: row.buyer,
    seller: row.seller,
    offer: { id: row.offer.id, amount: decimalToNumber(row.offer.amount), counterAmount: row.offer.counterAmount ? decimalToNumber(row.offer.counterAmount) : null },
    payments: row.payments.map((payment) => ({
      id: payment.id,
      status: payment.status,
      amount: decimalToNumber(payment.amount),
      receiptUrl: payment.receiptUrl,
      createdAt: payment.createdAt.toISOString(),
    })),
  };
}

export async function listReservations(userId: string): Promise<ReservationDTO[]> {
  const rows = await prisma.reservation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { createdAt: "desc" },
    include: reservationInclude,
  });
  return rows.map(toReservationDTO);
}

export async function getReservation(reservationId: string, user: { id: string; role: string }) {
  const row = await prisma.reservation.findUnique({ where: { id: reservationId }, include: reservationInclude });
  if (!row) throw new NotFoundError("Reservation not found.");
  if (row.buyerId !== user.id && row.sellerId !== user.id && user.role !== "ADMIN") throw new ForbiddenError();
  return toReservationDTO(row);
}

// Buyer starts the reservation for an accepted offer: creates the reservation row (if needed)
// and a Stripe Checkout session for the deposit. Returns the Checkout URL.
export async function startReservationCheckout(user: { id: string; email?: string | null }, offerId: string) {
  if (!stripeConfigured) throw new ConflictError("Payments are not configured on this server. Add Stripe test keys to enable reservation deposits.");
  const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: { property: true, reservation: true } });
  if (!offer) throw new NotFoundError("Offer not found.");
  if (offer.buyerId !== user.id) throw new ForbiddenError("Only the buyer can reserve this property.");
  if (offer.status !== "ACCEPTED") throw new ConflictError("Only accepted offers can be reserved.");
  if (offer.property.status !== "UNDER_OFFER") throw new ConflictError("This property is no longer available for reservation.");
  if (offer.reservation && ["DEPOSIT_PAID", "COMPLETED"].includes(offer.reservation.status)) {
    throw new ConflictError("The deposit for this reservation has already been paid.");
  }

  const reservation =
    offer.reservation ??
    (await prisma.reservation.create({
      data: {
        reference: referenceCode("DKR"),
        propertyId: offer.propertyId,
        offerId: offer.id,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        depositAmount: offer.property.depositAmount,
        currency: offer.property.currency,
      },
    }));
  if (!offer.reservation) {
    await audit({ actorId: user.id, action: "reservation.created", targetType: "Reservation", targetId: reservation.id, metadata: { offerId } });
  }

  const stripe = getStripe();
  const amountMinor = toMinorUnits(reservation.depositAmount, reservation.currency);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    client_reference_id: reservation.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: reservation.currency.toLowerCase(),
          unit_amount: amountMinor,
          product_data: {
            name: `Reservation deposit · ${offer.property.title}`,
            description: `Reference ${reservation.reference}. Reservation deposit only - not a legal transfer of ownership.`,
          },
        },
      },
    ],
    metadata: { reservationId: reservation.id, offerId: offer.id, propertyId: offer.propertyId, buyerId: user.id },
    payment_intent_data: { metadata: { reservationId: reservation.id } },
    success_url: absoluteUrl(`/dashboard/reservations?checkout=success&reservation=${reservation.id}`),
    cancel_url: absoluteUrl(`/dashboard/reservations?checkout=cancelled&reservation=${reservation.id}`),
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  await prisma.$transaction([
    prisma.reservation.update({ where: { id: reservation.id }, data: { stripeCheckoutSessionId: session.id, status: "PENDING_PAYMENT" } }),
    prisma.payment.create({
      data: {
        reservationId: reservation.id,
        amount: reservation.depositAmount,
        currency: reservation.currency,
        status: "PENDING",
        stripeCheckoutSessionId: session.id,
      },
    }),
  ]);

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

// ---------------------------------------------------------------------------
// Webhook processing (idempotent)
// ---------------------------------------------------------------------------

export async function handleStripeEvent(event: Stripe.Event) {
  // Each event id is processed exactly once even if Stripe retries delivery.
  const alreadyProcessed = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (alreadyProcessed) return { duplicate: true };

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status === "paid") await markDepositPaid(session);
      break;
    }
    case "checkout.session.async_payment_failed": {
      await markPaymentFailed(event.data.object, "Payment failed");
      break;
    }
    case "checkout.session.expired": {
      await markPaymentFailed(event.data.object, "Checkout session expired", "EXPIRED");
      break;
    }
    default:
      break;
  }

  await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  return { duplicate: false };
}

async function markDepositPaid(session: Stripe.Checkout.Session) {
  const reservationId = session.metadata?.reservationId ?? session.client_reference_id;
  if (!reservationId) return;
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  const result = await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({ where: { id: reservationId }, include: { property: { select: { title: true } } } });
    if (!reservation) return null;
    if (reservation.status === "DEPOSIT_PAID" || reservation.status === "COMPLETED") return null;

    const paidAt = new Date();
    await tx.payment.updateMany({
      where: { reservationId, stripeCheckoutSessionId: session.id },
      data: { status: "SUCCEEDED", stripePaymentIntentId: paymentIntentId ?? undefined },
    });
    await tx.reservation.update({ where: { id: reservationId }, data: { status: "DEPOSIT_PAID", paidAt } });
    await tx.property.update({ where: { id: reservation.propertyId }, data: { status: "RESERVED" } });
    await audit({ actorId: reservation.buyerId, action: "reservation.paid", targetType: "Reservation", targetId: reservationId, metadata: { sessionId: session.id, amountTotal: session.amount_total } }, tx);
    return reservation;
  });
  if (!result) return;

  const amount = formatMoney(decimalToNumber(result.depositAmount), result.currency);
  await notify({ userId: result.buyerId, type: "RESERVATION_PAID", title: "Deposit received", body: `Your ${amount} deposit for "${result.property.title}" is confirmed. Reference ${result.reference}.`, href: "/dashboard/reservations", emailPreference: "emailOnReservation" });
  await notify({ userId: result.sellerId, type: "RESERVATION_PAID", title: "Property reserved", body: `The buyer paid the ${amount} reservation deposit for "${result.property.title}".`, href: "/dashboard/reservations", emailPreference: "emailOnReservation" });
}

async function markPaymentFailed(session: Stripe.Checkout.Session, reason: string, paymentStatus: "FAILED" | "EXPIRED" = "FAILED") {
  const reservationId = session.metadata?.reservationId ?? session.client_reference_id;
  if (!reservationId) return;
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { property: { select: { title: true } } } });
  if (!reservation || reservation.status !== "PENDING_PAYMENT") return;
  await prisma.payment.updateMany({ where: { reservationId, stripeCheckoutSessionId: session.id, status: "PENDING" }, data: { status: paymentStatus, failureReason: reason } });
  if (paymentStatus === "FAILED") {
    await notify({ userId: reservation.buyerId, type: "RESERVATION_FAILED", title: "Deposit payment failed", body: `The deposit payment for "${reservation.property.title}" did not go through. You can try again from your reservations.`, href: "/dashboard/reservations", emailPreference: "emailOnReservation" });
  }
}

// ---------------------------------------------------------------------------
// Admin / seller lifecycle
// ---------------------------------------------------------------------------

export async function completeReservation(adminId: string, reservationId: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { property: { select: { title: true, listingType: true } } } });
  if (!reservation) throw new NotFoundError("Reservation not found.");
  if (reservation.status !== "DEPOSIT_PAID") throw new ConflictError("Only reservations with a paid deposit can be completed.");
  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({ where: { id: reservationId }, data: { status: "COMPLETED", completedAt: new Date() } });
    await tx.property.update({ where: { id: reservation.propertyId }, data: { status: reservation.property.listingType === "RENT" ? "RENTED" : "SOLD", soldAt: new Date() } });
    await audit({ actorId: adminId, action: "reservation.completed", targetType: "Reservation", targetId: reservationId }, tx);
  });
  for (const userId of [reservation.buyerId, reservation.sellerId]) {
    await notify({ userId, type: "RESERVATION_UPDATED", title: "Transaction completed", body: `The transaction for "${reservation.property.title}" (ref ${reservation.reference}) has been marked complete.`, href: "/dashboard/reservations", emailPreference: "emailOnReservation" });
  }
}

export async function cancelReservation(actor: { id: string; role: string }, reservationId: string, reason: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { property: { select: { title: true } } } });
  if (!reservation) throw new NotFoundError("Reservation not found.");
  const isParty = reservation.buyerId === actor.id || reservation.sellerId === actor.id;
  if (!isParty && actor.role !== "ADMIN") throw new ForbiddenError();
  if (reservation.status === "COMPLETED" || reservation.status === "CANCELLED") throw new ConflictError("This reservation is already closed.");
  // Parties can only cancel while unpaid; refunds of paid deposits are an admin decision.
  if (reservation.status === "DEPOSIT_PAID" && actor.role !== "ADMIN") throw new ForbiddenError("Contact support to cancel a reservation with a paid deposit.");

  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({ where: { id: reservationId }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason } });
    // The listing goes back on the market.
    await tx.property.update({ where: { id: reservation.propertyId }, data: { status: "ACTIVE" } });
    await tx.offer.update({ where: { id: reservation.offerId }, data: { status: "WITHDRAWN", respondedAt: new Date() } });
    await audit({ actorId: actor.id, action: "reservation.cancelled", targetType: "Reservation", targetId: reservationId, metadata: { reason } }, tx);
  });
  for (const userId of [reservation.buyerId, reservation.sellerId]) {
    if (userId === actor.id) continue;
    await notify({ userId, type: "RESERVATION_UPDATED", title: "Reservation cancelled", body: `The reservation for "${reservation.property.title}" (ref ${reservation.reference}) was cancelled. ${reason}`, href: "/dashboard/reservations", emailPreference: "emailOnReservation" });
  }
}
