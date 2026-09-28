import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env, stripeConfigured } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/server/services/reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe webhook receiver. The raw body is required for signature verification, so this must
// be a route handler (never a server action). Events are processed idempotently by event id.
export async function POST(request: Request) {
  if (!stripeConfigured || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.warn("[stripe] webhook signature verification failed", (error as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const result = await handleStripeEvent(event);
    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    // Returning 500 makes Stripe retry; the idempotency table prevents double processing.
    console.error("[stripe] failed to process event", event.id, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
