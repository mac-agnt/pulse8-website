import "server-only";
import { randomBytes } from "node:crypto";
import type { StoreTx } from "@/lib/booking/store-backend.server";
import { backend, type EmailKind, type EmailRecord } from "@/lib/booking/store.server";
import type { PricedLine } from "@/lib/shop-pricing";

/**
 * Shop orders. Same storage, transactions and email records as course
 * bookings, but a separate collection: there are no seats, so none of the
 * booking rules apply, and nothing here can change a booking.
 *
 * Two ways in. With payments on, an order is created `pending`, paid in
 * Stripe Checkout and confirmed only by the signed webhook. With payments
 * off, it is created `requested` and emailed to staff, who confirm stock,
 * delivery and payment with the customer, as the old store's order form did.
 */

export type ShopOrderStatus =
  /** payments off: sent to staff as an order request */
  | "requested"
  /** customer in Stripe Checkout */
  | "pending"
  /** Checkout finished, payment method not settled yet */
  | "processing"
  | "paid"
  | "expired"
  | "failed"
  /** paid, but the payment did not match the order. Staff reconcile it. */
  | "exception"
  /** paid, then refunded in full in Stripe */
  | "refunded";

export type ShopCustomer = {
  name: string;
  email: string;
  phone: string;
  organisation: string;
  /** delivery address, as typed */
  address: string;
  eircode: string;
  notes: string;
};

export type ShopOrder = {
  /** order reference, shown to the customer */
  id: string;
  /** one per order form submission, so a double submit reuses the same order */
  attemptKey: string;
  mode: "payment" | "request";
  lines: PricedLine[];
  /** cents */
  subtotal: number;
  /** cents */
  delivery: number;
  /** cents */
  amountTotal: number;
  currency: "eur";
  customer: ShopCustomer;
  status: ShopOrderStatus;
  livemode: boolean;
  checkoutSessionId?: string;
  checkoutUrl?: string;
  paymentIntentId?: string;
  /** pending orders lapse with their Checkout Session */
  expiresAt?: string;
  createdAt: string;
  paidAt?: string;
  exceptionReason?: string;
  /** cents refunded in Stripe so far */
  amountRefunded?: number;
  refundedAt?: string;
  emails: Record<EmailKind, EmailRecord>;
};

const transaction = <T>(work: (tx: StoreTx) => Promise<T>) => backend().transaction(work);
const reads = () => backend().reads;

function newShopReference(): string {
  // Same alphabet as booking references, with its own prefix.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (const byte of randomBytes(8)) out += alphabet[byte % alphabet.length];
  return `S8-${out}`;
}

/** Same basket, same amounts: what decides whether a repeat submit reuses an order. */
function sameBasket(order: ShopOrder, lines: PricedLine[], total: number): boolean {
  const key = (list: PricedLine[]) =>
    list.map((line) => `${line.slug}:${line.option ?? ""}:${line.quantity}:${line.unitAmount}`).sort().join("|");
  return order.amountTotal === total && key(order.lines) === key(lines);
}

export type ShopOrderRequest = Pick<
  ShopOrder,
  "attemptKey" | "mode" | "lines" | "subtotal" | "delivery" | "customer" | "livemode"
>;

/**
 * Creates the order, or returns the one already made for this attempt when
 * the basket is unchanged and the order is still live (a double submit, or a
 * retry after a network error).
 */
export function createShopOrder(request: ShopOrderRequest): Promise<{ order: ShopOrder; reused: boolean }> {
  return transaction(async (tx) => {
    const now = Date.now();
    const amountTotal = request.subtotal + request.delivery;
    const existing = await tx.shopByAttempt(request.attemptKey);
    const live =
      existing &&
      existing.mode === request.mode &&
      (existing.status === "requested" ||
        existing.status === "processing" ||
        existing.status === "paid" ||
        (existing.status === "pending" && Date.parse(existing.expiresAt ?? "") > now));
    if (existing && live && sameBasket(existing, request.lines, amountTotal)) {
      return { order: existing, reused: true };
    }

    const order: ShopOrder = {
      ...request,
      id: newShopReference(),
      amountTotal,
      currency: "eur",
      status: request.mode === "payment" ? "pending" : "requested",
      createdAt: new Date(now).toISOString(),
      emails: {
        customer: { status: "pending", attempts: 0 },
        staff: { status: "pending", attempts: 0 },
      },
    };
    await tx.putShop(order);
    return { order, reused: false };
  });
}

function updateShop<T>(orderId: string, change: (order: ShopOrder) => T): Promise<T | undefined> {
  return transaction(async (tx) => {
    const order = await tx.getShop(orderId);
    if (!order) return undefined;
    const result = change(order);
    await tx.putShop(order);
    return result;
  });
}

export async function attachShopCheckout(
  orderId: string,
  checkout: { id: string; url: string; expiresAt: number },
): Promise<void> {
  await updateShop(orderId, (order) => {
    order.checkoutSessionId = checkout.id;
    order.checkoutUrl = checkout.url;
    order.expiresAt = new Date(checkout.expiresAt * 1000).toISOString();
  });
}

/** Checkout expired, failed, or never started. */
export async function closeShopOrder(orderId: string, status: "expired" | "failed"): Promise<void> {
  await updateShop(orderId, (order) => {
    if (order.status === "pending" || order.status === "processing") order.status = status;
  });
}

export function markShopProcessing(orderId: string, paymentIntentId: string | undefined) {
  return updateShop(orderId, (order) => {
    if (order.status === "pending") {
      order.status = "processing";
      order.paymentIntentId = paymentIntentId ?? order.paymentIntentId;
    }
    return order;
  });
}

/**
 * The paid transition, idempotent. There is no stock to re-check, so a
 * payment that lands after the Checkout lapsed on our side still confirms.
 */
export function markShopPaid(
  orderId: string,
  paymentIntentId: string | undefined,
): Promise<{ order: ShopOrder; firstTime: boolean } | undefined> {
  return updateShop(orderId, (order) => {
    if (order.status === "paid" || order.status === "exception" || order.status === "refunded") {
      return { order, firstTime: false };
    }
    order.status = "paid";
    order.paymentIntentId = paymentIntentId ?? order.paymentIntentId;
    order.paidAt = new Date().toISOString();
    return { order, firstTime: true };
  });
}

/** Paid, but not as ordered (amount, currency or session). Staff reconcile it. */
export function flagShopException(orderId: string, reason: string) {
  return updateShop(orderId, (order) => {
    if (order.status !== "paid" && order.status !== "refunded") {
      order.status = "exception";
      order.exceptionReason = reason;
      order.paidAt ??= new Date().toISOString();
    }
    return order;
  });
}

/**
 * A refund made in Stripe. `amountRefunded` is Stripe's running total, so a
 * replay changes nothing. A full refund closes the order; a part refund is
 * recorded and staff, who made it, handle the rest.
 */
export function markShopRefunded(orderId: string, amountRefunded: number) {
  return updateShop(orderId, (order) => {
    if (amountRefunded > (order.amountRefunded ?? 0)) order.amountRefunded = amountRefunded;
    const refundable = order.status === "paid" || order.status === "exception";
    if (refundable && amountRefunded >= order.amountTotal) {
      order.status = "refunded";
      order.refundedAt = new Date().toISOString();
    }
    return order;
  });
}

export async function recordShopEmail(
  orderId: string,
  kind: EmailKind,
  outcome: { ok: true; providerId?: string } | { ok: false; error: string },
): Promise<void> {
  await updateShop(orderId, (order) => {
    const record = order.emails[kind];
    record.attempts += 1;
    if (outcome.ok) {
      record.status = "sent";
      record.sentAt = new Date().toISOString();
      record.providerId = outcome.providerId;
      delete record.lastError;
    } else {
      record.status = "failed";
      record.lastError = outcome.error.slice(0, 300);
    }
  });
}

export function getShopOrder(orderId: string): Promise<ShopOrder | undefined> {
  return reads().getShop(orderId);
}

export function getShopOrderByCheckoutSession(checkoutSessionId: string): Promise<ShopOrder | undefined> {
  return reads().findShopBy("checkoutSessionId", checkoutSessionId);
}

export function getShopOrderByPaymentIntent(paymentIntentId: string): Promise<ShopOrder | undefined> {
  return reads().findShopBy("paymentIntentId", paymentIntentId);
}

export function listShopOrders(): Promise<ShopOrder[]> {
  return reads().allShop();
}
