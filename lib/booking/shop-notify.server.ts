import "server-only";
import { staffRecipients } from "@/lib/booking/config.server";
import { formatAmount } from "@/lib/booking/notify.server";
import { getShopOrder, recordShopEmail, type ShopOrder } from "@/lib/booking/shop-store.server";
import type { EmailKind } from "@/lib/booking/store.server";
import { detailsHtml, detailsText, escapeHtml, sendMail } from "@/lib/mail/send.server";
import { lineLabel } from "@/lib/shop-pricing";

/**
 * Shop order emails, built like the booking emails: one to the customer and
 * one to staff per order, each with its own delivery record and a fixed
 * provider idempotency key, so either can fail and be retried alone.
 */

const money = (cents: number) => formatAmount(cents, "eur");

function itemsText(order: ShopOrder): string {
  return order.lines
    .map((line) => `${line.quantity} x ${lineLabel(line)}, ${money(line.unitAmount)} each = ${money(line.lineTotal)}`)
    .join("\n");
}

function itemsHtml(order: ShopOrder): string {
  const cell = "font-family:Arial,sans-serif;font-size:14px;padding:6px 12px 6px 0;vertical-align:top";
  const rows = order.lines
    .map(
      (line) =>
        `<tr><td style="${cell}">${line.quantity} &times;</td><td style="${cell}">${escapeHtml(lineLabel(line))}</td><td style="${cell};text-align:right">${escapeHtml(money(line.lineTotal))}</td></tr>`,
    )
    .join("");
  return `<table style="border-collapse:collapse;margin:12px 0">${rows}</table>`;
}

function deliveryText(order: ShopOrder): string {
  if (order.mode === "request") return "Confirmed by email";
  return order.delivery === 0 ? "No charge" : money(order.delivery);
}

function address(order: ShopOrder): string {
  return `${order.customer.address.replace(/\s*\n\s*/g, ", ")}, ${order.customer.eircode}`;
}

function totals(order: ShopOrder): Array<[string, string]> {
  return order.mode === "payment"
    ? [
        ["Goods", money(order.subtotal)],
        ["Delivery", deliveryText(order)],
        ["Amount paid", money(order.amountTotal)],
      ]
    : [["Goods", `${money(order.subtotal)} (delivery and payment confirmed by email)`]];
}

function customerMail(order: ShopOrder) {
  const paid = order.mode === "payment";
  const rows: Array<[string, string]> = [
    ["Order reference", order.id],
    ...totals(order),
    ["Deliver to", address(order)],
  ];
  const intro = paid
    ? `Hi ${order.customer.name}, thanks for your order. Your payment has gone through and we'll be in touch about delivery.`
    : `Hi ${order.customer.name}, thanks for your order request. We'll email you to confirm stock, delivery and payment before anything ships.`;
  const outro = "If you have a question, reply to this email or write to info@pulse8.ie and quote your order reference.";
  const subject = paid ? `Order confirmed | Pulse 8 shop | ${order.id}` : `Order request received | Pulse 8 shop | ${order.id}`;
  return {
    to: [order.customer.email],
    replyTo: "info@pulse8.ie",
    subject,
    text: `${intro}\n\n${itemsText(order)}\n\n${detailsText(rows)}\n\n${outro}\n\nPulse 8\ninfo@pulse8.ie\n`,
    html: `<p style="font-family:Arial,sans-serif;font-size:15px">${escapeHtml(intro)}</p>${itemsHtml(order)}${detailsHtml(rows)}<p style="font-family:Arial,sans-serif;font-size:15px">${escapeHtml(outro)}</p><p style="font-family:Arial,sans-serif;font-size:15px">Pulse 8<br>info@pulse8.ie</p>`,
  };
}

function staffMail(order: ShopOrder) {
  const review = order.status === "exception";
  const paid = order.mode === "payment";
  const rows: Array<[string, string]> = [
    ...(review ? ([["ACTION NEEDED", order.exceptionReason ?? "Review this order."]] as Array<[string, string]>) : []),
    ...(!paid
      ? ([["ACTION NEEDED", "Order request, not paid. Confirm stock, delivery and payment with the customer."]] as Array<
          [string, string]
        >)
      : []),
    ["Order reference", order.id],
    ["Customer", order.customer.name],
    ["Email", order.customer.email],
    ["Phone", order.customer.phone],
    ...(order.customer.organisation ? ([["Organisation", order.customer.organisation]] as Array<[string, string]>) : []),
    ["Deliver to", address(order)],
    ...(order.customer.notes ? ([["Notes", order.customer.notes]] as Array<[string, string]>) : []),
    ...totals(order),
    ...(paid && order.deliveryConfirmed === false
      ? ([["Delivery rate", "Placeholder: no delivery was charged. Set the delivery rates in the website admin (Prices)."]] as Array<[string, string]>)
      : []),
    ...(paid
      ? ([
          ["Stripe Checkout Session", order.checkoutSessionId ?? "unknown"],
          ["Stripe PaymentIntent", order.paymentIntentId ?? "unknown"],
          ["Mode", order.livemode ? "live" : "TEST"],
        ] as Array<[string, string]>)
      : []),
  ];
  const subject = review
    ? `Paid shop order needs review | ${order.id}`
    : paid
      ? `Paid shop order | ${money(order.amountTotal)} | ${order.id}`
      : `Shop order request | ${money(order.subtotal)} | ${order.id}`;
  return {
    to: staffRecipients(),
    replyTo: order.customer.email,
    subject: paid && !order.livemode ? `[TEST] ${subject}` : subject,
    text: `${itemsText(order)}\n\n${detailsText(rows)}\n`,
    html: `${itemsHtml(order)}${detailsHtml(rows)}`,
  };
}

/** Which emails this order should have, given its state. */
function due(order: ShopOrder): EmailKind[] {
  if (order.status === "paid" || order.status === "requested") return ["customer", "staff"];
  // Paid but not as ordered: staff hear about it, the customer is not told it is confirmed.
  if (order.status === "exception") return ["staff"];
  return [];
}

export function shopEmailIsDue(order: ShopOrder, kind: EmailKind): boolean {
  return due(order).includes(kind);
}

export async function sendShopEmail(order: ShopOrder, kind: EmailKind) {
  const mail = kind === "customer" ? customerMail(order) : staffMail(order);
  const result = await sendMail({ ...mail, idempotencyKey: `shop-${order.id}-${kind}` });
  await recordShopEmail(order.id, kind, result.ok ? { ok: true, providerId: result.id } : { ok: false, error: result.error });
  if (!result.ok) console.error(`[shop] ${kind} email for ${order.id} failed:`, result.error);
  return result;
}

/** Sends whatever is due and not yet sent. Safe to call any number of times. */
export async function sendDueShopEmails(orderId: string): Promise<ShopOrder | undefined> {
  const order = await getShopOrder(orderId);
  if (!order) return undefined;
  for (const kind of due(order)) {
    if (order.emails[kind].status === "sent") continue;
    await sendShopEmail(order, kind);
  }
  return getShopOrder(orderId);
}
