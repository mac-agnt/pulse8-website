import "server-only";
import { staffRecipients } from "@/lib/booking/config.server";
import { getOrder, recordEmail, type EmailKind, type Order } from "@/lib/booking/store.server";
import { detailsHtml, detailsText, escapeHtml, sendMail } from "@/lib/mail/send.server";
import { formatDayLong } from "@/lib/schedule";

/**
 * Booking emails. One customer confirmation and one staff notification per
 * paid booking, each with its own delivery record so one can fail and be
 * retried without resending the other. The provider idempotency key is fixed
 * per booking and email type, so a retry after a timeout cannot deliver twice.
 */

export function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}

function when(order: Order): string {
  const days = order.sessionDays > 1 ? `, over ${order.sessionDays} days` : "";
  return `${formatDayLong(order.sessionDate)}, ${order.sessionStart} to ${order.sessionEnd}${days} (Irish time)`;
}

function customerMail(order: Order) {
  const rows: Array<[string, string]> = [
    ["Booking reference", order.id],
    ["Course", order.courseTitle],
    ["Date and time", when(order)],
    ["Location", `${order.venue} (${order.delivery})`],
    ["Places", String(order.quantity)],
    ["Amount paid", formatAmount(order.amountTotal, order.currency)],
  ];
  const intro = `Hi ${order.buyer.name}, thanks for booking with Pulse 8. Your place is confirmed.`;
  const outro =
    "We'll send any joining instructions before the course. If you have a question, reply to this email or write to info@pulse8.ie and quote your booking reference.";
  return {
    to: [order.buyer.email],
    replyTo: "info@pulse8.ie",
    subject: `Booking confirmed | ${order.courseTitle}`,
    text: `${intro}\n\n${detailsText(rows)}\n\n${outro}\n\nPulse 8 Training\ninfo@pulse8.ie\n`,
    html: `<p style="font-family:Arial,sans-serif;font-size:15px">${escapeHtml(intro)}</p>${detailsHtml(rows)}<p style="font-family:Arial,sans-serif;font-size:15px">${escapeHtml(outro)}</p><p style="font-family:Arial,sans-serif;font-size:15px">Pulse 8 Training<br>info@pulse8.ie</p>`,
  };
}

function staffMail(order: Order) {
  const review = order.status === "exception";
  const rows: Array<[string, string]> = [
    ...(review ? ([["ACTION NEEDED", order.exceptionReason ?? "Review this booking."]] as Array<[string, string]>) : []),
    ["Booking reference", order.id],
    ["Buyer", order.buyer.name],
    ["Buyer email", order.buyer.email],
    ["Buyer phone", order.buyer.phone],
    ["Course", order.courseTitle],
    ["Session", `${when(order)}, ${order.venue}`],
    ["Session id", order.sessionId],
    ["Quantity", String(order.quantity)],
    ["Total", formatAmount(order.amountTotal, order.currency)],
    ["Currency", order.currency.toUpperCase()],
    ["Stripe Checkout Session", order.checkoutSessionId ?? "unknown"],
    ["Stripe PaymentIntent", order.paymentIntentId ?? "unknown"],
    ["Mode", order.livemode ? "live" : "TEST"],
  ];
  const subject = `${review ? "Paid course booking needs review" : "Paid course booking"} | ${order.courseTitle} | ${order.id}`;
  return {
    to: staffRecipients(),
    replyTo: order.buyer.email,
    subject: order.livemode ? subject : `[TEST] ${subject}`,
    text: `${detailsText(rows)}\n`,
    html: detailsHtml(rows),
  };
}

/** Which emails this order should have, given its state. */
function due(order: Order): EmailKind[] {
  if (order.status === "paid") return ["customer", "staff"];
  // Paid but not confirmable: staff hear about it, the customer is not told it is confirmed.
  if (order.status === "exception") return ["staff"];
  return [];
}

export async function sendBookingEmail(order: Order, kind: EmailKind) {
  const mail = kind === "customer" ? customerMail(order) : staffMail(order);
  const result = await sendMail({ ...mail, idempotencyKey: `booking-${order.id}-${kind}` });
  await recordEmail(order.id, kind, result.ok ? { ok: true, providerId: result.id } : { ok: false, error: result.error });
  if (!result.ok) console.error(`[booking] ${kind} email for ${order.id} failed:`, result.error);
  return result;
}

/** Sends whatever is due and not yet sent. Safe to call any number of times. */
export async function sendDueBookingEmails(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) return;
  for (const kind of due(order)) {
    if (order.emails[kind].status === "sent") continue;
    await sendBookingEmail(order, kind);
  }
}

export function emailIsDue(order: Order, kind: EmailKind): boolean {
  return due(order).includes(kind);
}
