import "server-only";
import { blendedConfig } from "@/lib/blended/feed.server";
import { signedHeaders } from "@/lib/blended/signing";
import {
  getOrder,
  listOrders,
  recordBlendedDelivery,
  type BlendedEventKind,
  type Order,
} from "@/lib/booking/store.server";

/**
 * Tells Pulse 8 Blended Learning (BL) about paid and refunded bookings for its
 * practical days, so BL can create each attendee's account, enrol them, book
 * the day and send them the course link (or cancel all of that on a refund).
 *
 * One signed event per booking and kind, with a fixed id
 * (`web_<booking>_confirmed`, `web_<booking>_refunded`), so a retry is always
 * safe: BL handles each event id once. Every attempt is recorded on the order,
 * like the booking emails, and a failure never undoes a paid booking. Failed or
 * unsent events are retried by the daily cron (app/api/cron/blended-learning)
 * and by staff (POST /api/admin/bookings/<ref>/blended-learning).
 */

const BOOKINGS_PATH = "/api/integrations/bookings";
const TIMEOUT_MS = 10_000;

export function blendedEventId(orderId: string, kind: BlendedEventKind): string {
  return `web_${orderId}_${kind}`;
}

function splitName(name: string): { first: string; last: string } {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  return { first: first.slice(0, 100), last: rest.join(" ").slice(0, 100) };
}

/** The event body, contract v2 B. */
export function blendedEvent(order: Order, kind: BlendedEventKind, now: Date = new Date()) {
  const blended = order.blended;
  if (!blended) throw new Error(`${order.id} is not a Blended Learning booking`);
  const buyer = splitName(order.buyer.name);
  return {
    id: blendedEventId(order.id, kind),
    type: kind === "confirmed" ? "booking.confirmed" : "booking.refunded",
    created_at: now.toISOString(),
    data: {
      booking_id: order.id,
      course_slug: blended.courseSlug,
      payment_status: "paid",
      learner: {
        email: order.buyer.email,
        first_name: buyer.first || order.buyer.email,
        last_name: buyer.last,
        phone: order.buyer.phone,
      },
      practical: { session_id: blended.sessionId },
      attendees: blended.attendees.map((attendee) => ({
        email: attendee.email,
        first_name: attendee.firstName,
        last_name: attendee.lastName,
      })),
      amount_paid_cents: order.amountTotal,
    },
  };
}

/** Which BL events this order still needs delivered. */
export function dueBlendedEvents(order: Order): BlendedEventKind[] {
  const deliveries = order.blended?.deliveries;
  if (!deliveries) return [];
  const due: BlendedEventKind[] = [];
  if (order.status === "paid" && deliveries.confirmed && deliveries.confirmed.status !== "sent") due.push("confirmed");
  if (order.status === "refunded" && deliveries.refunded && deliveries.refunded.status !== "sent") due.push("refunded");
  return due;
}

export type DeliveryResult = { ok: true } | { ok: false; error: string; unconfigured?: boolean };

/** Sends one event now and records the attempt. Not configured: nothing is sent or recorded. */
export async function deliverBlendedEvent(order: Order, kind: BlendedEventKind): Promise<DeliveryResult> {
  const config = blendedConfig();
  if (!config) return { ok: false, error: "Blended Learning is not configured on this server.", unconfigured: true };

  const body = JSON.stringify(blendedEvent(order, kind));
  let result: DeliveryResult;
  try {
    const response = await fetch(`${config.baseUrl}${BOOKINGS_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...signedHeaders(config.secret, body) },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) {
      result = { ok: true };
    } else {
      // BL's short status or error line only; it carries no personal data.
      const detail = (await response.json().catch(() => null)) as { status?: string; error?: string } | null;
      const reason = [detail?.status, detail?.error].filter(Boolean).join(": ").slice(0, 160);
      result = { ok: false, error: `Blended Learning answered ${response.status}${reason ? ` (${reason})` : ""}` };
    }
  } catch (error) {
    result = { ok: false, error: `Could not reach Blended Learning: ${(error as Error).name}` };
  }

  await recordBlendedDelivery(order.id, kind, result);
  if (!result.ok) console.error(`[blended-learning] ${kind} for ${order.id} failed:`, result.error);
  return result;
}

/** Sends whatever is due and not yet delivered. Safe to call any number of times. */
export async function sendDueBlendedEvents(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) return;
  for (const kind of dueBlendedEvents(order)) await deliverBlendedEvent(order, kind);
}

/** The cron's pass: every booking with an undelivered BL event. */
export async function retryDueBlendedEvents(): Promise<{ attempted: number; delivered: number; failed: number }> {
  const summary = { attempted: 0, delivered: 0, failed: 0 };
  if (!blendedConfig()) return summary;
  for (const order of await listOrders()) {
    for (const kind of dueBlendedEvents(order)) {
      summary.attempted += 1;
      const result = await deliverBlendedEvent(order, kind);
      if (result.ok) summary.delivered += 1;
      else summary.failed += 1;
    }
  }
  return summary;
}
