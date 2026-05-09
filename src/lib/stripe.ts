import "server-only";

import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Returns a singleton instance of the Stripe client.
 * Fails loudly at runtime if STRIPE_SECRET_KEY is missing.
 */
export function getStripe() {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    // In production, we want to fail loudly if Stripe is actually invoked without a key.
    // During build time, this helper won't be called unless a page tries to use Stripe.
    throw new Error(
      "STRIPE_SECRET_KEY is missing. Stripe operations cannot be performed."
    );
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });

  return stripeInstance;
}
