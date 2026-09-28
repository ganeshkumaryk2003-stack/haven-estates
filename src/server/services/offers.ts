import "server-only";
import type { OfferStatus, Prisma } from "@/generated/prisma/client";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { decimalToNumber } from "@/lib/money";
import { prisma, type DbClient } from "@/lib/prisma";
import { audit } from "@/server/services/audit";
import { ensureConnection } from "@/server/services/connections";
import { notify } from "@/server/services/notifications";
import { isOpenForEngagement } from "@/server/services/properties";
import type { OfferDTO } from "@/types/dto";
import type { CounterOfferInput, OfferInput } from "@/validations/engagement";

const offerInclude = {
  property: {
    select: { id: true, slug: true, title: true, price: true, status: true, listingType: true, images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } } },
  },
  buyer: { select: { id: true, name: true, image: true, role: true, profile: { select: { company: true } } } },
  seller: { select: { id: true, name: true, image: true, role: true, profile: { select: { company: true } } } },
  reservation: { select: { id: true } },
} satisfies Prisma.OfferInclude;

type OfferRow = Prisma.OfferGetPayload<{ include: typeof offerInclude }>;

export function toOfferDTO(row: OfferRow): OfferDTO {
  return {
    id: row.id,
    amount: decimalToNumber(row.amount),
    currency: row.currency,
    financing: row.financing,
    conditions: row.conditions,
    message: row.message,
    expiresAt: row.expiresAt.toISOString(),
    status: row.status,
    counterAmount: row.counterAmount ? decimalToNumber(row.counterAmount) : null,
    counterMessage: row.counterMessage,
    counteredAt: row.counteredAt?.toISOString() ?? null,
    respondedAt: row.respondedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    property: {
      id: row.property.id,
      slug: row.property.slug,
      title: row.property.title,
      coverImage: row.property.images[0]?.url ?? null,
      price: decimalToNumber(row.property.price),
      status: row.property.status,
      listingType: row.property.listingType,
    },
    buyer: { id: row.buyer.id, name: row.buyer.name, image: row.buyer.image, role: row.buyer.role, company: row.buyer.profile?.company ?? null },
    seller: { id: row.seller.id, name: row.seller.name, image: row.seller.image, role: row.seller.role, company: row.seller.profile?.company ?? null },
    reservationId: row.reservation?.id ?? null,
  };
}

// Lazily expire offers whose deadline passed. Runs before reads so lists are accurate without a cron.
export async function expireStaleOffers(db: DbClient = prisma) {
  const stale = await db.offer.findMany({ where: { status: { in: ["PENDING", "COUNTERED"] }, expiresAt: { lt: new Date() } }, select: { id: true, buyerId: true, sellerId: true, property: { select: { title: true } } } });
  if (stale.length === 0) return;
  await db.offer.updateMany({ where: { id: { in: stale.map((offer) => offer.id) } }, data: { status: "EXPIRED", respondedAt: new Date() } });
  for (const offer of stale) {
    await notify({ userId: offer.buyerId, type: "OFFER_EXPIRED", title: "Offer expired", body: `Your offer on "${offer.property.title}" expired.`, href: "/dashboard/offers" }, db);
    await notify({ userId: offer.sellerId, type: "OFFER_EXPIRED", title: "Offer expired", body: `An offer on "${offer.property.title}" expired without a response.`, href: "/dashboard/offers" }, db);
  }
}

export async function createOffer(user: { id: string; name?: string | null }, input: OfferInput) {
  const property = await prisma.property.findUnique({ where: { id: input.propertyId } });
  if (!property) throw new NotFoundError("Listing not found.");
  if (property.ownerId === user.id) throw new ForbiddenError("You cannot make an offer on your own listing.");
  if (!isOpenForEngagement(property.status)) throw new ConflictError("This listing is not accepting offers right now.");

  const existing = await prisma.offer.findFirst({ where: { propertyId: property.id, buyerId: user.id, status: { in: ["PENDING", "COUNTERED", "ACCEPTED"] } } });
  if (existing) throw new ConflictError("You already have an open offer on this listing. Withdraw it before making a new one.");

  const offer = await prisma.$transaction(async (tx) => {
    await ensureConnection({ buyerId: user.id, sellerId: property.ownerId, propertyId: property.id }, tx);
    const created = await tx.offer.create({
      data: {
        propertyId: property.id,
        buyerId: user.id,
        sellerId: property.ownerId,
        amount: input.amount,
        currency: property.currency,
        financing: input.financing,
        conditions: input.conditions,
        message: input.message,
        expiresAt: new Date(input.expiresAt),
      },
    });
    await audit({ actorId: user.id, action: "offer.created", targetType: "Offer", targetId: created.id, metadata: { amount: input.amount } }, tx);
    return created;
  });

  await notify({
    userId: property.ownerId,
    type: "NEW_OFFER",
    title: `New offer on ${property.title}`,
    body: `${user.name ?? "A buyer"} offered ${formatMoney(input.amount, property.currency)}.`,
    href: "/dashboard/offers",
    emailPreference: "emailOnOffer",
  });
  return offer;
}

export async function listOffers(userId: string, role: "buyer" | "seller"): Promise<OfferDTO[]> {
  await expireStaleOffers();
  const rows = await prisma.offer.findMany({
    where: role === "buyer" ? { buyerId: userId } : { sellerId: userId },
    orderBy: { createdAt: "desc" },
    include: offerInclude,
  });
  return rows.map(toOfferDTO);
}

export async function getOffer(offerId: string, user: { id: string; role: string }) {
  const row = await prisma.offer.findUnique({ where: { id: offerId }, include: offerInclude });
  if (!row) throw new NotFoundError("Offer not found.");
  if (row.buyerId !== user.id && row.sellerId !== user.id && user.role !== "ADMIN") throw new ForbiddenError();
  return row;
}

function assertStatus(current: OfferStatus, allowed: OfferStatus[], message: string) {
  if (!allowed.includes(current)) throw new ConflictError(message);
}

export async function counterOffer(user: { id: string; name?: string | null }, input: CounterOfferInput) {
  const offer = await prisma.offer.findUnique({ where: { id: input.offerId }, include: { property: { select: { title: true } } } });
  if (!offer) throw new NotFoundError("Offer not found.");
  if (offer.sellerId !== user.id) throw new ForbiddenError("Only the seller can counter this offer.");
  assertStatus(offer.status, ["PENDING"], "Only pending offers can be countered.");
  if (offer.expiresAt < new Date()) throw new ConflictError("This offer has expired.");

  await prisma.offer.update({
    where: { id: offer.id },
    data: { status: "COUNTERED", counterAmount: input.counterAmount, counterMessage: input.counterMessage, counteredAt: new Date() },
  });
  await audit({ actorId: user.id, action: "offer.updated", targetType: "Offer", targetId: offer.id, metadata: { action: "counter", counterAmount: input.counterAmount } });
  await notify({
    userId: offer.buyerId,
    type: "COUNTER_OFFER",
    title: `Counteroffer on ${offer.property.title}`,
    body: `The seller countered with ${formatMoney(input.counterAmount, offer.currency)}.`,
    href: "/dashboard/offers",
    emailPreference: "emailOnOffer",
  });
}

export type OfferDecision = "accept" | "reject" | "withdraw" | "accept_counter" | "reject_counter";

export async function decideOffer(user: { id: string; name?: string | null }, offerId: string, decision: OfferDecision) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: { property: { select: { id: true, title: true, status: true } } } });
  if (!offer) throw new NotFoundError("Offer not found.");
  const isSeller = offer.sellerId === user.id;
  const isBuyer = offer.buyerId === user.id;
  if (!isSeller && !isBuyer) throw new ForbiddenError();

  const now = new Date();
  const finalAmount = offer.counterAmount ?? offer.amount;

  switch (decision) {
    case "accept": {
      if (!isSeller) throw new ForbiddenError("Only the seller can accept an offer.");
      assertStatus(offer.status, ["PENDING"], "Only pending offers can be accepted.");
      if (offer.expiresAt < now) throw new ConflictError("This offer has expired.");
      await acceptOffer(offer.id, offer.property.id, offer.buyerId, offer.sellerId, user.id);
      await notify({ userId: offer.buyerId, type: "OFFER_ACCEPTED", title: "Offer accepted 🎉", body: `Your offer of ${formatMoney(decimalToNumber(offer.amount), offer.currency)} on "${offer.property.title}" was accepted. You can now reserve the property.`, href: "/dashboard/offers", emailPreference: "emailOnOffer" });
      return;
    }
    case "accept_counter": {
      if (!isBuyer) throw new ForbiddenError("Only the buyer can accept a counteroffer.");
      assertStatus(offer.status, ["COUNTERED"], "There is no counteroffer to accept.");
      if (offer.expiresAt < now) throw new ConflictError("This offer has expired.");
      await acceptOffer(offer.id, offer.property.id, offer.buyerId, offer.sellerId, user.id);
      await notify({ userId: offer.sellerId, type: "OFFER_ACCEPTED", title: "Counteroffer accepted", body: `${user.name ?? "The buyer"} accepted your counteroffer of ${formatMoney(decimalToNumber(finalAmount), offer.currency)} on "${offer.property.title}".`, href: "/dashboard/offers", emailPreference: "emailOnOffer" });
      return;
    }
    case "reject": {
      if (!isSeller) throw new ForbiddenError("Only the seller can reject an offer.");
      assertStatus(offer.status, ["PENDING", "COUNTERED"], "This offer can no longer be rejected.");
      await prisma.offer.update({ where: { id: offer.id }, data: { status: "REJECTED", respondedAt: now } });
      await audit({ actorId: user.id, action: "offer.updated", targetType: "Offer", targetId: offer.id, metadata: { action: "reject" } });
      await notify({ userId: offer.buyerId, type: "OFFER_REJECTED", title: "Offer declined", body: `The seller declined your offer on "${offer.property.title}".`, href: "/dashboard/offers", emailPreference: "emailOnOffer" });
      return;
    }
    case "reject_counter": {
      if (!isBuyer) throw new ForbiddenError("Only the buyer can decline a counteroffer.");
      assertStatus(offer.status, ["COUNTERED"], "There is no counteroffer to decline.");
      await prisma.offer.update({ where: { id: offer.id }, data: { status: "REJECTED", respondedAt: now } });
      await audit({ actorId: user.id, action: "offer.updated", targetType: "Offer", targetId: offer.id, metadata: { action: "reject_counter" } });
      await notify({ userId: offer.sellerId, type: "OFFER_REJECTED", title: "Counteroffer declined", body: `${user.name ?? "The buyer"} declined your counteroffer on "${offer.property.title}".`, href: "/dashboard/offers", emailPreference: "emailOnOffer" });
      return;
    }
    case "withdraw": {
      if (!isBuyer) throw new ForbiddenError("Only the buyer can withdraw an offer.");
      assertStatus(offer.status, ["PENDING", "COUNTERED"], "Only open offers can be withdrawn.");
      await prisma.offer.update({ where: { id: offer.id }, data: { status: "WITHDRAWN", respondedAt: now } });
      await audit({ actorId: user.id, action: "offer.updated", targetType: "Offer", targetId: offer.id, metadata: { action: "withdraw" } });
      await notify({ userId: offer.sellerId, type: "OFFER_WITHDRAWN", title: "Offer withdrawn", body: `${user.name ?? "The buyer"} withdrew their offer on "${offer.property.title}".`, href: "/dashboard/offers", emailPreference: "emailOnOffer" });
      return;
    }
  }
}

// Accepting an offer moves the property to UNDER_OFFER and expires competing open offers.
async function acceptOffer(offerId: string, propertyId: string, buyerId: string, sellerId: string, actorId: string) {
  await prisma.$transaction(async (tx) => {
    const property = await tx.property.findUniqueOrThrow({ where: { id: propertyId }, select: { status: true, title: true } });
    if (!["ACTIVE", "UNDER_OFFER"].includes(property.status)) throw new ConflictError("This listing is no longer available.");
    const otherAccepted = await tx.offer.count({ where: { propertyId, status: "ACCEPTED", id: { not: offerId } } });
    if (otherAccepted > 0) throw new ConflictError("Another offer has already been accepted for this listing.");

    await tx.offer.update({ where: { id: offerId }, data: { status: "ACCEPTED", respondedAt: new Date() } });
    await tx.property.update({ where: { id: propertyId }, data: { status: "UNDER_OFFER" } });

    const competing = await tx.offer.findMany({ where: { propertyId, id: { not: offerId }, status: { in: ["PENDING", "COUNTERED"] } }, select: { id: true, buyerId: true } });
    if (competing.length > 0) {
      await tx.offer.updateMany({ where: { id: { in: competing.map((offer) => offer.id) } }, data: { status: "EXPIRED", respondedAt: new Date() } });
      for (const other of competing) {
        await notify({ userId: other.buyerId, type: "OFFER_EXPIRED", title: "Offer closed", body: `The seller accepted a different offer on "${property.title}".`, href: "/dashboard/offers", emailPreference: "emailOnOffer" }, tx);
      }
    }
    await audit({ actorId, action: "offer.updated", targetType: "Offer", targetId: offerId, metadata: { action: "accept", buyerId, sellerId } }, tx);
    await audit({ actorId, action: "property.status_changed", targetType: "Property", targetId: propertyId, metadata: { to: "UNDER_OFFER", reason: "offer_accepted" } }, tx);
  });
}
