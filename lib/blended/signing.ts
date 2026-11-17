import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Message signing between this site and Pulse 8 Blended Learning (BL), both
 * directions, one shared secret (BLENDED_LEARNING_SECRET here,
 * BOOKING_WEBHOOK_SECRET on BL's side):
 *
 *   x-pulse8-timestamp: <unix seconds>
 *   x-pulse8-signature: sha256=<hex HMAC-SHA256(secret, "<timestamp>.<payload>")>
 *
 * For a POST the payload is the raw body. For the signed course-list GET it is
 * "GET /api/integrations/courses". Anything more than five minutes old or
 * ahead is refused.
 *
 * Server code only (it is imported by *.server.ts modules); kept free of
 * framework imports so the unit tests can load it directly.
 */

export const SIGNATURE_TOLERANCE_SECONDS = 300;

export const TIMESTAMP_HEADER = "x-pulse8-timestamp";
export const SIGNATURE_HEADER = "x-pulse8-signature";

export const FEED_PATH = "/api/integrations/courses";
/** What a signed course-list request signs, after "<timestamp>." */
export const FEED_PAYLOAD = `GET ${FEED_PATH}`;

export function sign(secret: string, timestamp: number, payload: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")}`;
}

export function signedHeaders(secret: string, payload: string, nowMs: number = Date.now()): Record<string, string> {
  const timestamp = Math.floor(nowMs / 1000);
  return { [TIMESTAMP_HEADER]: String(timestamp), [SIGNATURE_HEADER]: sign(secret, timestamp, payload) };
}

export function verify(input: {
  secret: string;
  payload: string;
  timestamp: string | null;
  signature: string | null;
  nowMs?: number;
}): boolean {
  const { secret, payload, timestamp, signature } = input;
  if (!secret || !timestamp || !signature?.startsWith("sha256=")) return false;
  if (!/^\d{1,12}$/.test(timestamp)) return false;
  const ts = Number(timestamp);
  const now = Math.floor((input.nowMs ?? Date.now()) / 1000);
  if (Math.abs(now - ts) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const hex = signature.slice("sha256=".length);
  if (!/^[0-9a-f]{64}$/i.test(hex)) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest();
  const given = Buffer.from(hex, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
