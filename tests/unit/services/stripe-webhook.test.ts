import type Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { handleStripeEvent } from "@/server/services/reservations";
import { createRun } from "../../helpers/factories";

const run = createRun();
let seller: Awaited<ReturnType<typeof run.user>>;
let buyer: Awaited<ReturnType<typeof run.user>>;
let propertyId: string;
let reservationId: string;
const sessionId = `cs_test_${run.runId}`;
const eventId = `evt_test_${run.runId}`;

beforeAll(async () => {
  seller = await run.user({ role: "SELLER" });
  buyer = await run.user();
  const property = await run.property(seller.id, { status: "UNDER_OFFER" });
  propertyId = property.id;
  const offer = await prisma.offer.create({
    data: { propertyId, buyerId: buyer.id, sellerId: seller.id, amount: 450_000, expiresAt: new Date(Date.now() + 86_400_000), status: "ACCEPTED" },
  });
  const reservation = await prisma.reservation.create({
    data: { reference: `HVN-${run.runId}`, propertyId, offerId: offer.id, buyerId: buyer.id, sellerId: seller.id, depositAmount: 5_000, stripeCheckoutSessionId: sessionId },
  });
  reservationId = reservation.id;
  await prisma.payment.create({ data: { reservationId, amount: 5_000, stripeCheckoutSessionId: sessionId } });
});

afterAll(async () => {
  await prisma.stripeEvent.deleteMany({ where: { id: eventId } });
  await run.cleanup();
});

function checkoutCompletedEvent(): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    type: "checkout.session.completed",
    api_version: "2024-01-01",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        payment_status: "paid",
        payment_intent: `pi_test_${run.runId}`,
        client_reference_id: reservationId,
        metadata: { reservationId },
        amount_total: 500_000,
      } as unknown as Stripe.Checkout.Session,
    },
  } as unknown as Stripe.Event;
}

describe("stripe webhook processing", () => {
  it("marks the deposit paid, reserves the property and records the event", async () => {
    const first = await handleStripeEvent(checkoutCompletedEvent());
    expect(first.duplicate).toBe(false);

    const reservation = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId }, include: { payments: true } });
    expect(reservation.status).toBe("DEPOSIT_PAID");
    expect(reservation.paidAt).not.toBeNull();
    expect(reservation.payments[0]?.status).toBe("SUCCEEDED");
    expect(reservation.payments[0]?.stripePaymentIntentId).toBe(`pi_test_${run.runId}`);

    const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
    expect(property.status).toBe("RESERVED");

    const notifications = await prisma.notification.findMany({ where: { userId: { in: [buyer.id, seller.id] }, type: "RESERVATION_PAID" } });
    expect(notifications).toHaveLength(2);
  });

  it("ignores a redelivered event with the same id (idempotency)", async () => {
    const before = await prisma.notification.count({ where: { type: "RESERVATION_PAID", userId: { in: [buyer.id, seller.id] } } });
    const second = await handleStripeEvent(checkoutCompletedEvent());
    expect(second.duplicate).toBe(true);
    const after = await prisma.notification.count({ where: { type: "RESERVATION_PAID", userId: { in: [buyer.id, seller.id] } } });
    expect(after).toBe(before);
    expect(await prisma.stripeEvent.count({ where: { id: eventId } })).toBe(1);
  });

  it("does not double-process a different event for an already paid reservation", async () => {
    const other = { ...checkoutCompletedEvent(), id: `${eventId}_retry` } as Stripe.Event;
    const result = await handleStripeEvent(other);
    expect(result.duplicate).toBe(false);
    const count = await prisma.notification.count({ where: { type: "RESERVATION_PAID", userId: { in: [buyer.id, seller.id] } } });
    expect(count).toBe(2);
    await prisma.stripeEvent.deleteMany({ where: { id: `${eventId}_retry` } });
  });
});
