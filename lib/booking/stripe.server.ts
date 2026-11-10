import "server-only";
import Stripe from "stripe";

/**
 * Stripe client. Keys come from the environment only.
 *
 * With a TEST key only, STRIPE_API_HOST / STRIPE_API_PORT / STRIPE_API_PROTOCOL
 * can point the SDK at a local mock, which is how scripts/booking-check.mjs
 * exercises checkout creation without a network call. Ignored for live keys.
 */
let cached: { key: string; client: Stripe } | null = null;

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (cached?.key === key) return cached.client;

  const mock =
    !keyIsLive() && process.env.STRIPE_API_HOST
      ? {
          host: process.env.STRIPE_API_HOST,
          port: Number(process.env.STRIPE_API_PORT ?? 12111),
          protocol: (process.env.STRIPE_API_PROTOCOL ?? "http") as "http" | "https",
        }
      : {};

  const client = new Stripe(key, {
    maxNetworkRetries: 2,
    timeout: 20_000,
    appInfo: { name: "pulse8-website" },
    ...mock,
  });
  cached = { key, client };
  return client;
}

/** Whether the configured key is a live one. Webhook events must agree. */
export function keyIsLive(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return key.startsWith("sk_live_") || key.startsWith("rk_live_");
}
