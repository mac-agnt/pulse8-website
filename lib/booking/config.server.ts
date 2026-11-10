import "server-only";

/**
 * Booking and payment settings, all from the environment.
 *
 * Online payment is OFF unless every one of these holds:
 *   BOOKING_PAYMENTS_ENABLED=1
 *   STRIPE_SECRET_KEY        sk_test_... (or sk_live_... once approved)
 *   STRIPE_WEBHOOK_SECRET    whsec_...
 *   SITE_URL                 origin used for Stripe's return URLs
 * and, for a live key, BOOKING_ALLOW_LIVE=1 as a second, deliberate switch.
 * With payments off, every date offers "Enquire about this course" instead.
 */

export type PaymentConfig = {
  secretKey: string;
  webhookSecret: string;
  /** false for sk_test_ keys. Webhook events must match. */
  livemode: boolean;
  siteUrl: string;
  currency: "eur";
};

/** Origins Stripe may send customers back to. The first is the default. */
function allowedOrigins(): string[] {
  const list = [process.env.SITE_URL, ...(process.env.SITE_URL_ALLOWLIST ?? "").split(",")]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  if (process.env.NODE_ENV !== "production") list.push("http://localhost:3000");
  return list.flatMap((value) => {
    try {
      return [new URL(value).origin];
    } catch {
      return [];
    }
  });
}

/** The configured origin matching this request, or the default one. Never the raw Host header. */
export function returnOrigin(requestOrigin: string | null): string | null {
  const origins = allowedOrigins();
  if (requestOrigin && origins.includes(requestOrigin)) return requestOrigin;
  return origins[0] ?? null;
}

export function paymentConfig(): PaymentConfig | null {
  if (process.env.BOOKING_PAYMENTS_ENABLED !== "1") return null;

  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const siteUrl = returnOrigin(null);
  if (!secretKey || !webhookSecret || !siteUrl) return null;

  const livemode = secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_");
  if (livemode && process.env.BOOKING_ALLOW_LIVE !== "1") return null;
  if (!livemode && !secretKey.startsWith("sk_test_") && !secretKey.startsWith("rk_test_")) {
    return null;
  }

  return { secretKey, webhookSecret, livemode, siteUrl, currency: "eur" };
}

/** Seats are held this long while the customer is in Stripe Checkout (Stripe's minimum is 30 minutes). */
export const HOLD_MINUTES = 31;
export const CHECKOUT_EXPIRY_MINUTES = 30;

/** Most places one checkout can buy. Larger groups are an enquiry. */
export const MAX_PLACES_PER_BOOKING = 6;

/** Where staff notifications go. Set on the server, never from a form. */
export function staffRecipients(): string[] {
  const list = (process.env.BOOKING_STAFF_EMAILS ?? "info@pulse8.ie")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return list.length ? list : ["info@pulse8.ie"];
}
