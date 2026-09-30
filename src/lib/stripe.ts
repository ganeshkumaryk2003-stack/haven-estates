import "server-only";
import Stripe from "stripe";
import { env, stripeConfigured } from "@/lib/env";

let client: Stripe | null = null;

// Lazily constructed so the app boots without Stripe keys (payments simply show as disabled).
export function getStripe(): Stripe {
  if (!stripeConfigured || !env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.");
  }
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY, { typescript: true, appInfo: { name: "Doorkey Realty", version: "1.0.0" } });
  }
  return client;
}

export { stripeConfigured };
