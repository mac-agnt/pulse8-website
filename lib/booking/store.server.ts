import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Bookings, seat holds and processed Stripe events.
 *
 * DEVELOPMENT AND TEST STORE. A JSON file guarded by an in-process lock: every
 * read-modify-write runs one at a time, so holds are atomic within one server
 * process and the file is replaced by rename, never half-written. That is the
 * right shape for `next dev`, a single Node host and the automated checks.
 *
 * It is NOT enough for live payments on Vercel: the file system there is
 * read-only and several instances can run at once. Before live enablement,
 * put a transactional store (Postgres or similar) behind these same functions.
 * Nothing outside this file touches storage.
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
  | "exception";

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
  emails: Record<EmailKind, EmailRecord>;
};

type StoreData = {
  orders: Order[];
  /** Stripe event ids already handled, newest last */
  events: string[];
};

const MAX_EVENTS = 5000;

function storeFile(): string {
  const dir = process.env.BOOKING_DATA_DIR ?? path.join(process.cwd(), ".data");
  return path.join(dir, "bookings.json");
}

async function load(): Promise<StoreData> {
  try {
    const parsed = JSON.parse(await readFile(storeFile(), "utf8")) as Partial<StoreData>;
    return {
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { orders: [], events: [] };
    throw error;
  }
}

async function save(data: StoreData): Promise<void> {
  const file = storeFile();
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(temp, file);
}

let queue: Promise<unknown> = Promise.resolve();

/** Runs one read-modify-write at a time. */
function transaction<T>(work: (data: StoreData) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const data = await load();
    const result = await work(data);
    await save(data);
    return result;
  });
  // Keep the chain alive after a failure.
  queue = run.catch(() => undefined);
  return run;
}

async function read<T>(work: (data: StoreData) => T): Promise<T> {
  await queue.catch(() => undefined);
  return work(await load());
}

function holdsSeat(order: Order, now: number): boolean {
  if (order.status === "paid") return true;
  // A delayed payment method has been authorised; keep the seat until it settles.
  if (order.status === "processing") return true;
  return order.status === "pending" && Date.parse(order.holdExpiresAt) > now;
}

function seatsTakenIn(data: StoreData, sessionId: string, now: number, except?: string): number {
  return data.orders
    .filter((order) => order.sessionId === sessionId && order.id !== except && holdsSeat(order, now))
    .reduce((total, order) => total + order.quantity, 0);
}

/** Places taken or held per session, for public availability. */
export function seatsTakenBySession(now = Date.now()): Promise<Map<string, number>> {
  return read((data) => {
    const map = new Map<string, number>();
    for (const order of data.orders) {
      if (!holdsSeat(order, now)) continue;
      map.set(order.sessionId, (map.get(order.sessionId) ?? 0) + order.quantity);
    }
    return map;
  });
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
  "id" | "status" | "createdAt" | "holdExpiresAt" | "emails" | "amountTotal"
> & {
  /** seats Pulse 8 has released for online booking on this date */
  capacity: number;
  holdMinutes: number;
};

export type HoldResult =
  | { ok: true; order: Order; reused: boolean }
  | { ok: false; reason: "unavailable" };

/**
 * Takes an expiring hold on `quantity` seats, atomically. A repeat of the same
 * attempt returns the order already created for it instead of a second hold.
 */
export function createHold(request: HoldRequest): Promise<HoldResult> {
  return transaction((data) => {
    const now = Date.now();
    const existing = data.orders.find(
      (order) =>
        order.attemptKey === request.attemptKey &&
        order.sessionId === request.sessionId &&
        order.status === "pending" &&
        Date.parse(order.holdExpiresAt) > now,
    );
    if (existing) return { ok: true, order: existing, reused: true } as const;

    const free = request.capacity - seatsTakenIn(data, request.sessionId, now);
    if (request.quantity < 1 || free < request.quantity) {
      return { ok: false, reason: "unavailable" } as const;
    }

    const { capacity: _capacity, holdMinutes, ...fields } = request;
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
    };
    data.orders.push(order);
    return { ok: true, order, reused: false } as const;
  });
}

export function attachCheckout(
  orderId: string,
  checkout: { id: string; url: string; expiresAt: number },
): Promise<void> {
  return transaction((data) => {
    const order = data.orders.find((item) => item.id === orderId);
    if (!order) return;
    order.checkoutSessionId = checkout.id;
    order.checkoutUrl = checkout.url;
    // Tie the hold to Checkout's own expiry, with a minute's grace.
    order.holdExpiresAt = new Date(checkout.expiresAt * 1000 + 60_000).toISOString();
  });
}

/** Releases a hold that never reached Checkout. */
export function releaseHold(orderId: string, status: "expired" | "failed" = "failed"): Promise<void> {
  return transaction((data) => {
    const order = data.orders.find((item) => item.id === orderId);
    if (order && (order.status === "pending" || order.status === "processing")) order.status = status;
  });
}

export function getOrder(orderId: string): Promise<Order | undefined> {
  return read((data) => data.orders.find((order) => order.id === orderId));
}

export function getOrderByCheckoutSession(checkoutSessionId: string): Promise<Order | undefined> {
  return read((data) => data.orders.find((order) => order.checkoutSessionId === checkoutSessionId));
}

export function listOrders(): Promise<Order[]> {
  return read((data) => [...data.orders]);
}

/**
 * Records a Stripe event id. Returns false when it was already recorded, so a
 * replayed or concurrently delivered event is handled once.
 */
export function claimEvent(eventId: string): Promise<boolean> {
  return transaction((data) => {
    if (data.events.includes(eventId)) return false;
    data.events.push(eventId);
    if (data.events.length > MAX_EVENTS) data.events.splice(0, data.events.length - MAX_EVENTS);
    return true;
  });
}

/** Forgets an event whose handling failed part-way, so Stripe's retry runs it again. */
export function unclaimEvent(eventId: string): Promise<void> {
  return transaction((data) => {
    data.events = data.events.filter((id) => id !== eventId);
  });
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
  return transaction((data): PaidOutcome => {
    const order = data.orders.find((item) => item.id === orderId);
    if (!order) return { kind: "missing" };
    if (order.status === "paid") return { kind: "confirmed", order, firstTime: false };
    if (order.status === "exception") return { kind: "exception", order, firstTime: false };

    const now = Date.now();
    order.paymentIntentId = paymentIntentId ?? order.paymentIntentId;
    order.paidAt = new Date(now).toISOString();

    if (!holdsSeat(order, now)) {
      // The hold lapsed (or the session changed). Confirm only if the seat is
      // genuinely still free; otherwise staff decide.
      const free = capacity === null ? 0 : capacity - seatsTakenIn(data, order.sessionId, now, order.id);
      if (free < order.quantity) {
        order.status = "exception";
        order.exceptionReason =
          capacity === null
            ? "Paid for a session that is no longer published. Contact the customer and confirm or refund."
            : "Payment arrived after the seat hold expired and the session no longer has room. Confirm or refund.";
        return { kind: "exception", order, firstTime: true };
      }
    }

    order.status = "paid";
    return { kind: "confirmed", order, firstTime: true };
  });
}

/** Checkout completed with a payment that has not settled (delayed methods). */
export function markProcessing(orderId: string, paymentIntentId: string | undefined): Promise<Order | undefined> {
  return transaction((data) => {
    const order = data.orders.find((item) => item.id === orderId);
    if (order && order.status === "pending") {
      order.status = "processing";
      order.paymentIntentId = paymentIntentId ?? order.paymentIntentId;
    }
    return order;
  });
}

export function recordEmail(
  orderId: string,
  kind: EmailKind,
  outcome: { ok: true; providerId?: string } | { ok: false; error: string },
): Promise<void> {
  return transaction((data) => {
    const order = data.orders.find((item) => item.id === orderId);
    if (!order) return;
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

/** Marks an order for staff review (amount, currency or session mismatch). */
export function flagException(orderId: string, reason: string): Promise<Order | undefined> {
  return transaction((data) => {
    const order = data.orders.find((item) => item.id === orderId);
    if (order && order.status !== "paid") {
      order.status = "exception";
      order.exceptionReason = reason;
      order.paidAt ??= new Date().toISOString();
    }
    return order;
  });
}
