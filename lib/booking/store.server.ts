import "server-only";
import { randomBytes } from "node:crypto";
import type { StoreBackend, StoreTx } from "@/lib/booking/store-backend.server";
import { fileBackend } from "@/lib/booking/store-file.server";
import { pgBackend } from "@/lib/booking/store-pg.server";

/**
 * Bookings, seat holds and processed Stripe events.
 *
 * Every booking rule lives here; storage sits behind a small backend
 * (store-backend.server.ts). With BOOKING_DATABASE_URL set it is Postgres,
 * which is what live payments on Vercel need. Without it, a JSON file under
 * .data/, which is right for `next dev`, a single Node host and the automated
 * checks. Nothing outside these files touches storage.
 */

export type EmailKind = "customer" | "staff";

export type EmailRecord = {
  status: "pending" | "sent" | "failed";
  attempts: number;
  lastError?: string;
  sentAt?: string;
  providerId?: string;
};

export type OrderStatus =
  /** seat held, customer in Checkout */
  | "pending"
  /** Checkout finished but the payment method has not settled yet */
  | "processing"
  | "paid"
  | "expired"
  | "failed"
  /** paid, but no seat could be assigned. Staff must resolve it. */
  | "exception"
  /** paid, then refunded in full in Stripe. The places are free again. */
  | "refunded";

/** One person on a Blended Learning booking. Each gets their own account and email from BL. */
export type Attendee = { firstName: string; lastName: string; email: string };

export type BlendedEventKind = "confirmed" | "refunded";

/** Delivery of one signed event to Blended Learning, retried on its own like an email. */
export type DeliveryRecord = {
  status: "pending" | "sent" | "failed";
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  sentAt?: string;
};

/** Set on orders for a practical day that Pulse 8 Blended Learning runs. */
export type BlendedBooking = {
  /** BL course id: the key, never changes */
  courseId: string;
  /** BL course slug when the booking was made, which BL's booking API asks for */
  courseSlug: string;
  /** BL practical day id, without the website's `bl_` prefix */
  sessionId: string;
  attendees: Attendee[];
  deliveries: Partial<Record<BlendedEventKind, DeliveryRecord>>;
};

export type Order = {
  /** booking reference, shown to the customer */
  id: string;
  /** one per booking form submission, so a double submit reuses the same order */
  attemptKey: string;
  sessionId: string;
  courseSlug: string;
  courseTitle: string;
  sessionDate: string;
  sessionStart: string;
  sessionEnd: string;
  sessionDays: number;
  venue: string;
  delivery: string;
  quantity: number;
  /** cents */
  unitAmount: number;
  /** cents */
  amountTotal: number;
  currency: "eur";
  buyer: { name: string; email: string; phone: string };
  status: OrderStatus;
  livemode: boolean;
  checkoutSessionId?: string;
  checkoutUrl?: string;
  paymentIntentId?: string;
  holdExpiresAt: string;
  createdAt: string;
  paidAt?: string;
  exceptionReason?: string;
  /** cents refunded in Stripe so far */
  amountRefunded?: number;
  refundedAt?: string;
  emails: Record<EmailKind, EmailRecord>;
  blended?: BlendedBooking;
};

/** The storage in use. Shop orders (shop-store.server.ts) share it. */
export function backend(): StoreBackend {
  return process.env.BOOKING_DATABASE_URL ? pgBackend : fileBackend;
}

const transaction = <T>(work: (tx: StoreTx) => Promise<T>) => backend().transaction(work);
const reads = () => backend().reads;

/**
 * Whether an order takes up a place in the website's own count.
 *
 * Paid, settling and unexpired pending orders do. One exception: a paid
 * Blended Learning booking stops counting once BL has accepted it, because
 * from then on it is inside BL's own `places_left`, and counting it here too
 * would take the place twice.
 */
function holdsSeat(order: Order, now: number): boolean {
  if (order.status === "paid") return order.blended?.deliveries.confirmed?.status !== "sent";
  // A delayed payment method has been authorised; keep the seat until it settles.
  if (order.status === "processing") return true;
  return order.status === "pending" && Date.parse(order.holdExpiresAt) > now;
}

function seatsTaken(orders: Order[], now: number, except?: string): number {
  return orders
    .filter((order) => order.id !== except && holdsSeat(order, now))
    .reduce((total, order) => total + order.quantity, 0);
}

/** Places taken or held per session, for public availability. */
export async function seatsTakenBySession(now = Date.now()): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const order of await reads().live()) {
    if (!holdsSeat(order, now)) continue;
    map.set(order.sessionId, (map.get(order.sessionId) ?? 0) + order.quantity);
  }
  return map;
}

function newReference(): string {
  // Unambiguous characters only, so a reference read over the phone survives.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `P8-${out}`;
}

export type HoldRequest = Omit<
  Order,
  "id" | "status" | "createdAt" | "holdExpiresAt" | "emails" | "amountTotal" | "blended"
> & {
  /** seats Pulse 8 has released for online booking on this date */
  capacity: number;
  holdMinutes: number;
  blended?: Omit<BlendedBooking, "deliveries">;
};

export type HoldResult =
  | { ok: true; order: Order; reused: boolean }
  | { ok: false; reason: "unavailable" };

/**
 * Takes an expiring hold on `quantity` seats, atomically. A repeat of the same
 * attempt returns the order already created for it instead of a second hold.
 */
export function createHold(request: HoldRequest): Promise<HoldResult> {
  return transaction(async (tx): Promise<HoldResult> => {
    const now = Date.now();
    const sessionOrders = await tx.bySession(request.sessionId);
    const existing = sessionOrders.find(
      (order) =>
        order.attemptKey === request.attemptKey &&
        order.status === "pending" &&
        Date.parse(order.holdExpiresAt) > now,
    );
    if (existing) return { ok: true, order: existing, reused: true };

    const free = request.capacity - seatsTaken(sessionOrders, now);
    if (request.quantity < 1 || free < request.quantity) {
      return { ok: false, reason: "unavailable" };
    }

    const { capacity: _capacity, holdMinutes, blended, ...fields } = request;
    void _capacity;
    const order: Order = {
      ...fields,
      id: newReference(),
      amountTotal: request.unitAmount * request.quantity,
      status: "pending",
      createdAt: new Date(now).toISOString(),
      holdExpiresAt: new Date(now + holdMinutes * 60_000).toISOString(),
      emails: {
        customer: { status: "pending", attempts: 0 },
        staff: { status: "pending", attempts: 0 },
      },
      ...(blended ? { blended: { ...blended, deliveries: {} } } : {}),
    };
    await tx.put(order);
    return { ok: true, order, reused: false };
  });
}

/** Changes one order inside a transaction; `change` may return a value. */
function update<T>(orderId: string, change: (order: Order) => T): Promise<T | undefined> {
  return transaction(async (tx) => {
    const order = await tx.get(orderId);
    if (!order) return undefined;
    const result = change(order);
    await tx.put(order);
    return result;
  });
}

export async function attachCheckout(
  orderId: string,
  checkout: { id: string; url: string; expiresAt: number },
): Promise<void> {
  await update(orderId, (order) => {
    order.checkoutSessionId = checkout.id;
    order.checkoutUrl = checkout.url;
    // Tie the hold to Checkout's own expiry, with a minute's grace.
    order.holdExpiresAt = new Date(checkout.expiresAt * 1000 + 60_000).toISOString();
  });
}

/** Releases a hold that never reached Checkout. */
export async function releaseHold(orderId: string, status: "expired" | "failed" = "failed"): Promise<void> {
  await update(orderId, (order) => {
    if (order.status === "pending" || order.status === "processing") order.status = status;
  });
}

export function getOrder(orderId: string): Promise<Order | undefined> {
  return reads().get(orderId);
}

export function getOrderByCheckoutSession(checkoutSessionId: string): Promise<Order | undefined> {
  return reads().findBy("checkoutSessionId", checkoutSessionId);
}

export function getOrderByPaymentIntent(paymentIntentId: string): Promise<Order | undefined> {
  return reads().findBy("paymentIntentId", paymentIntentId);
}

export function listOrders(): Promise<Order[]> {
  return reads().all();
}

/**
 * Records a Stripe event id. Returns false when it was already recorded, so a
 * replayed or concurrently delivered event is handled once.
 */
export function claimEvent(eventId: string): Promise<boolean> {
  return transaction((tx) => tx.claimEvent(eventId));
}

/** Forgets an event whose handling failed part-way, so Stripe's retry runs it again. */
export function unclaimEvent(eventId: string): Promise<void> {
  return transaction((tx) => tx.unclaimEvent(eventId));
}

export type PaidOutcome =
  | { kind: "confirmed"; order: Order; firstTime: boolean }
  | { kind: "exception"; order: Order; firstTime: boolean }
  | { kind: "missing" };

/**
 * The paid transition. Idempotent: a second call for a paid order changes
 * nothing. If the hold lapsed before payment landed, the seat is re-checked;
 * when it cannot be assigned the order is flagged for staff rather than
 * confirmed.
 */
export function markPaid(
  orderId: string,
  paymentIntentId: string | undefined,
  /** current seats released for the session, or null if the session is gone */
  capacity: number | null,
): Promise<PaidOutcome> {
  return transaction(async (tx): Promise<PaidOutcome> => {
    const order = await tx.get(orderId);
    if (!order) return { kind: "missing" };
    if (order.status === "paid") return { kind: "confirmed", order, firstTime: false };
    if (order.status === "exception") return { kind: "exception", order, firstTime: false };

    const now = Date.now();
    order.paymentIntentId = paymentIntentId ?? order.paymentIntentId;
    order.paidAt = new Date(now).toISOString();

    if (!holdsSeat(order, now)) {
      // The hold lapsed (or the session changed). Confirm only if the seat is
      // genuinely still free; otherwise staff decide.
      const free =
        capacity === null ? 0 : capacity - seatsTaken(await tx.bySession(order.sessionId), now, order.id);
      if (free < order.quantity) {
        order.status = "exception";
        order.exceptionReason =
          capacity === null
            ? "Paid for a session that is no longer published. Contact the customer and confirm or refund."
            : "Payment arrived after the seat hold expired and the session no longer has room. Confirm or refund.";
        await tx.put(order);
        return { kind: "exception", order, firstTime: true };
      }
    }

    order.status = "paid";
    if (order.blended) order.blended.deliveries.confirmed ??= { status: "pending", attempts: 0 };
    await tx.put(order);
    return { kind: "confirmed", order, firstTime: true };
  });
}

/** Checkout completed with a payment that has not settled (delayed methods). */
export function markProcessing(orderId: string, paymentIntentId: string | undefined): Promise<Order | undefined> {
  return update(orderId, (order) => {
    if (order.status === "pending") {
      order.status = "processing";
      order.paymentIntentId = paymentIntentId ?? order.paymentIntentId;
    }
    return order;
  });
}

export async function recordEmail(
  orderId: string,
  kind: EmailKind,
  outcome: { ok: true; providerId?: string } | { ok: false; error: string },
): Promise<void> {
  await update(orderId, (order) => {
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

/** Records one attempt to deliver an event to Blended Learning. */
export async function recordBlendedDelivery(
  orderId: string,
  kind: BlendedEventKind,
  outcome: { ok: true } | { ok: false; error: string },
): Promise<void> {
  await update(orderId, (order) => {
    if (!order.blended) return;
    const record = (order.blended.deliveries[kind] ??= { status: "pending", attempts: 0 });
    const now = new Date().toISOString();
    record.attempts += 1;
    record.lastAttemptAt = now;
    if (outcome.ok) {
      record.status = "sent";
      record.sentAt = now;
      delete record.lastError;
    } else {
      record.status = "failed";
      record.lastError = outcome.error.slice(0, 300);
    }
  });
}

/** Marks an order for staff review (amount, currency or session mismatch). */
export function flagException(orderId: string, reason: string): Promise<Order | undefined> {
  return update(orderId, (order) => {
    if (order.status !== "paid") {
      order.status = "exception";
      order.exceptionReason = reason;
      order.paidAt ??= new Date().toISOString();
    }
    return order;
  });
}

export type RefundOutcome =
  /** refunded in full: the order is now `refunded` and its places are free */
  | { kind: "full"; order: Order; firstTime: boolean }
  /** part refunded: nothing changes but the amount, staff review it */
  | { kind: "partial"; order: Order; firstTime: boolean }
  | { kind: "missing" };

/**
 * A refund reported by Stripe. `amountRefunded` is Stripe's running total for
 * the charge, so a replay or a repeat for the same total changes nothing and
 * `firstTime` is false. A part refund changes nothing here at all.
 */
export function markRefunded(orderId: string, amountRefunded: number): Promise<RefundOutcome> {
  return transaction(async (tx): Promise<RefundOutcome> => {
    const order = await tx.get(orderId);
    if (!order) return { kind: "missing" };
    if (order.status === "refunded") return { kind: "full", order, firstTime: false };

    const firstTime = amountRefunded > (order.amountRefunded ?? 0);

    const refundable = order.status === "paid" || order.status === "exception";
    if (refundable && amountRefunded >= order.amountTotal) {
      order.status = "refunded";
      order.amountRefunded = amountRefunded;
      order.refundedAt = new Date().toISOString();
      // BL needs telling whenever it may have the booking: always once it was
      // due there, even if no attempt has been recorded yet (one may be in flight).
      if (order.blended?.deliveries.confirmed) {
        order.blended.deliveries.refunded ??= { status: "pending", attempts: 0 };
      }
      await tx.put(order);
      return { kind: "full", order, firstTime: true };
    }

    // A part refund is only recorded once staff have been told (recordPartialRefund).
    return { kind: "partial", order, firstTime };
  });
}

/** Notes a part refund staff have been told about, so a repeat for the same total is not re-sent. */
export async function recordPartialRefund(orderId: string, amountRefunded: number): Promise<void> {
  await update(orderId, (order) => {
    if (amountRefunded > (order.amountRefunded ?? 0)) order.amountRefunded = amountRefunded;
  });
}
