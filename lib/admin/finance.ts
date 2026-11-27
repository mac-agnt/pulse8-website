import type { Order } from "../booking/store.server";
import type { ShopOrder } from "../booking/shop-store.server";

/**
 * The owner's Finance page: every payment the website has taken, from every
 * source, summed and bucketed for charts. Pure, so it is unit-tested without a
 * database (scripts/unit/finance.test.mjs); the route reads the orders and
 * passes them in.
 *
 * Sources:
 *   - classroom: course bookings Pulse 8 runs itself (an Order without `blended`)
 *   - blended:   practical-day bookings for Blended Learning courses (an Order with `blended`)
 *   - shop:      shop orders paid online (lines plus delivery)
 *
 * A payment counts once money has been taken: status paid, refunded or
 * exception (paid, but staff must sort something out). Pending, processing,
 * expired, failed and shop "requested" orders are not revenue. Processing and
 * exception are reported separately so the owner can see what is in flight.
 *
 * Refunds are taken off the payment they belong to, in the period the payment
 * was made, so a month's figure is what that month's sales came to in the end.
 *
 * Test and live payments are never mixed: `mode` picks one. While Stripe is in
 * test mode every payment is a test payment, so the page shows those, clearly
 * marked, until the first live one arrives.
 *
 * All amounts are in cents. Days and months are Irish time.
 */

export type FinanceSource = "classroom" | "blended" | "shop";
export type FinanceRange = "30d" | "90d" | "12m" | "all";
export type FinanceMode = "live" | "test";

export const SOURCE_LABELS: Record<FinanceSource, string> = {
  classroom: "Classroom courses",
  blended: "Blended Learning",
  shop: "Shop",
};

export const SOURCES: FinanceSource[] = ["classroom", "blended", "shop"];

export type Payment = {
  id: string;
  source: FinanceSource;
  /** when the money was taken (paidAt, else createdAt) */
  at: string;
  /** "Cardiac First Response · 2 places", "3 items + delivery" */
  description: string;
  customer: string;
  gross: number;
  refunded: number;
  net: number;
  status: "paid" | "refunded" | "exception";
  /** for top courses / products */
  items: Array<{ key: string; title: string; quantity: number; net: number }>;
};

export type PeriodBucket = {
  key: string;
  label: string;
  /** longer label for tooltips and the table */
  longLabel: string;
  classroom: number;
  blended: number;
  shop: number;
  total: number;
};

export type FinanceSummary = {
  mode: FinanceMode;
  hasLive: boolean;
  hasTest: boolean;
  range: FinanceRange;
  /** Irish date the range starts on (inclusive), null for all time */
  from: string | null;
  to: string;
  granularity: "day" | "week" | "month";
  totals: { gross: number; refunded: number; net: number; payments: number; averageOrder: number };
  /** net for the same length of time just before this one; null for all time */
  previousNet: number | null;
  bySource: Array<{ source: FinanceSource; label: string; gross: number; refunded: number; net: number; payments: number }>;
  periods: PeriodBucket[];
  topCourses: Array<{ title: string; source: FinanceSource; places: number; net: number }>;
  topProducts: Array<{ title: string; quantity: number; net: number }>;
  recent: Array<Omit<Payment, "items">>;
  attention: { processing: number; processingAmount: number; exceptions: number };
};

const MONEY_STATUSES = new Set(["paid", "refunded", "exception"]);

/* Irish dates ------------------------------------------------------------ */

const dublinFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Dublin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "2026-11-27" for an instant, in Irish time. */
export function dublinDate(instant: Date | string): string {
  const parts = Object.fromEntries(
    dublinFormat.formatToParts(typeof instant === "string" ? new Date(instant) : instant).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDays(day: string, days: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(month: string, months: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 7);
}

/** Monday of the week the day falls in. */
function weekStart(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return addDays(day, -offset);
}

const monthShort = (month: string) =>
  new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-IE", { month: "short", timeZone: "UTC" });
const monthLong = (month: string) =>
  new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-IE", { month: "long", year: "numeric", timeZone: "UTC" });
const dayShort = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-IE", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLong = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });

/* Orders to payments ----------------------------------------------------- */

function refundedOf(order: { status: string; amountTotal: number; amountRefunded?: number }): number {
  const refunded = order.amountRefunded ?? (order.status === "refunded" ? order.amountTotal : 0);
  return Math.min(Math.max(0, refunded), order.amountTotal);
}

/** Share a refund across items in proportion to their value, so per-item figures add up. */
function shareRefund<T extends { gross: number }>(items: T[], gross: number, refunded: number): Array<T & { net: number }> {
  if (!refunded || !gross) return items.map((item) => ({ ...item, net: item.gross }));
  return items.map((item) => ({ ...item, net: item.gross - Math.round((refunded * item.gross) / gross) }));
}

export function bookingPayment(order: Order): Payment {
  const refunded = refundedOf(order);
  const source: FinanceSource = order.blended ? "blended" : "classroom";
  return {
    id: order.id,
    source,
    at: order.paidAt ?? order.createdAt,
    description: `${order.courseTitle} · ${order.quantity} ${order.quantity === 1 ? "place" : "places"}`,
    customer: order.buyer.name,
    gross: order.amountTotal,
    refunded,
    net: order.amountTotal - refunded,
    status: order.status as Payment["status"],
    items: [{ key: `${source}:${order.courseSlug}`, title: order.courseTitle, quantity: order.quantity, net: order.amountTotal - refunded }],
  };
}

export function shopPayment(order: ShopOrder): Payment {
  const refunded = refundedOf(order);
  const count = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const lines = shareRefund(
    order.lines.map((line) => ({ key: `shop:${line.slug}`, title: line.name, quantity: line.quantity, gross: line.lineTotal })),
    order.amountTotal,
    refunded,
  );
  return {
    id: order.id,
    source: "shop",
    at: order.paidAt ?? order.createdAt,
    description:
      order.lines.length === 1
        ? `${order.lines[0].name}${order.lines[0].quantity > 1 ? ` × ${order.lines[0].quantity}` : ""}`
        : `${count} items`,
    customer: order.customer.organisation || order.customer.name,
    gross: order.amountTotal,
    refunded,
    net: order.amountTotal - refunded,
    status: order.status as Payment["status"],
    items: lines.map(({ key, title, quantity, net }) => ({ key, title, quantity, net })),
  };
}

/* Summary ---------------------------------------------------------------- */

function rangeStart(range: FinanceRange, today: string): string | null {
  if (range === "30d") return addDays(today, -29);
  if (range === "90d") return addDays(today, -89);
  if (range === "12m") return `${addMonths(today.slice(0, 7), -11)}-01`;
  return null;
}

function bucketsFor(granularity: "day" | "week" | "month", from: string, to: string): PeriodBucket[] {
  const empty = { classroom: 0, blended: 0, shop: 0, total: 0 };
  const out: PeriodBucket[] = [];
  if (granularity === "day") {
    for (let day = from; day <= to; day = addDays(day, 1)) {
      out.push({ key: day, label: dayShort(day), longLabel: dayLong(day), ...empty });
    }
  } else if (granularity === "week") {
    for (let week = weekStart(from); week <= to; week = addDays(week, 7)) {
      out.push({ key: week, label: dayShort(week), longLabel: `Week of ${dayLong(week)}`, ...empty });
    }
  } else {
    for (let month = from.slice(0, 7); month <= to.slice(0, 7); month = addMonths(month, 1)) {
      out.push({ key: month, label: monthShort(month), longLabel: monthLong(month), ...empty });
    }
  }
  return out;
}

function bucketKey(granularity: "day" | "week" | "month", day: string): string {
  if (granularity === "day") return day;
  if (granularity === "week") return weekStart(day);
  return day.slice(0, 7);
}

export function summariseFinance(
  input: { orders: Order[]; shopOrders: ShopOrder[] },
  options: { range: FinanceRange; mode?: FinanceMode; now?: Date },
): FinanceSummary {
  const now = options.now ?? new Date();
  const today = dublinDate(now);

  const allMoney = [
    ...input.orders.filter((o) => MONEY_STATUSES.has(o.status)).map((o) => ({ live: o.livemode, payment: bookingPayment(o) })),
    ...input.shopOrders
      .filter((o) => o.mode === "payment" && MONEY_STATUSES.has(o.status))
      .map((o) => ({ live: o.livemode, payment: shopPayment(o) })),
  ];
  const hasLive = allMoney.some((p) => p.live);
  const hasTest = allMoney.some((p) => !p.live);
  const mode: FinanceMode = options.mode ?? (hasLive || !hasTest ? "live" : "test");
  const wantLive = mode === "live";

  const payments = allMoney
    .filter((p) => p.live === wantLive)
    .map((p) => ({ ...p.payment, day: dublinDate(p.payment.at) }))
    .sort((a, b) => b.at.localeCompare(a.at));

  const firstDay = payments.length ? payments[payments.length - 1].day : today;
  const from = rangeStart(options.range, today);
  const start = from ?? firstDay;
  const inRange = payments.filter((p) => p.day >= start && p.day <= today);

  const granularity: "day" | "week" | "month" =
    options.range === "30d" ? "day" : options.range === "90d" ? "week" : "month";

  const periods = bucketsFor(granularity, start, today);
  const byKey = new Map(periods.map((bucket) => [bucket.key, bucket]));
  for (const p of inRange) {
    const bucket = byKey.get(bucketKey(granularity, p.day));
    if (!bucket) continue;
    bucket[p.source] += p.net;
    bucket.total += p.net;
  }

  const sum = (list: typeof inRange, field: "gross" | "refunded" | "net") => list.reduce((t, p) => t + p[field], 0);
  const net = sum(inRange, "net");

  let previousNet: number | null = null;
  if (from) {
    const lengthDays = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000) + 1;
    const prevFrom = addDays(from, -lengthDays);
    const prevTo = addDays(from, -1);
    previousNet = payments.filter((p) => p.day >= prevFrom && p.day <= prevTo).reduce((t, p) => t + p.net, 0);
  }

  const bySource = SOURCES.map((source) => {
    const list = inRange.filter((p) => p.source === source);
    return {
      source,
      label: SOURCE_LABELS[source],
      gross: sum(list, "gross"),
      refunded: sum(list, "refunded"),
      net: sum(list, "net"),
      payments: list.length,
    };
  });

  const items = new Map<string, { title: string; source: FinanceSource; quantity: number; net: number }>();
  for (const p of inRange) {
    for (const item of p.items) {
      const current = items.get(item.key) ?? { title: item.title, source: p.source, quantity: 0, net: 0 };
      current.quantity += item.quantity;
      current.net += item.net;
      items.set(item.key, current);
    }
  }
  const ranked = [...items.values()].filter((i) => i.net > 0).sort((a, b) => b.net - a.net);

  // In flight and needing attention: counted regardless of range, in the chosen mode.
  const inMode = <T extends { livemode: boolean }>(list: T[]) => list.filter((o) => o.livemode === wantLive);
  const processing = [
    ...inMode(input.orders).filter((o) => o.status === "processing"),
    ...inMode(input.shopOrders).filter((o) => o.status === "processing"),
  ];
  const exceptions =
    inMode(input.orders).filter((o) => o.status === "exception").length +
    inMode(input.shopOrders).filter((o) => o.status === "exception").length;

  return {
    mode,
    hasLive,
    hasTest,
    range: options.range,
    from,
    to: today,
    granularity,
    totals: {
      gross: sum(inRange, "gross"),
      refunded: sum(inRange, "refunded"),
      net,
      payments: inRange.length,
      averageOrder: inRange.length ? Math.round(net / inRange.length) : 0,
    },
    previousNet,
    bySource,
    periods,
    topCourses: ranked
      .filter((i) => i.source !== "shop")
      .slice(0, 8)
      .map(({ title, source, quantity, net: itemNet }) => ({ title, source, places: quantity, net: itemNet })),
    topProducts: ranked
      .filter((i) => i.source === "shop")
      .slice(0, 8)
      .map(({ title, quantity, net: itemNet }) => ({ title, quantity, net: itemNet })),
    recent: inRange.slice(0, 25).map(({ items: _items, day: _day, ...rest }) => {
      void _items;
      void _day;
      return rest;
    }),
    attention: {
      processing: processing.length,
      processingAmount: processing.reduce((t, o) => t + o.amountTotal, 0),
      exceptions,
    },
  };
}

/* Staff see bookings and orders without money ---------------------------- */

/** A booking as staff (not owners) see it: who, what and when, never amounts. */
export function bookingWithoutMoney<T extends Partial<Pick<Order, "unitAmount" | "amountTotal" | "amountRefunded">>>(order: T) {
  const { unitAmount: _u, amountTotal: _t, amountRefunded: _r, ...rest } = order;
  void _u;
  void _t;
  void _r;
  return rest;
}

/** A shop order as staff (not owners) see it: items and delivery details, never amounts. */
export function shopOrderWithoutMoney<
  T extends Partial<Pick<ShopOrder, "subtotal" | "delivery" | "amountTotal" | "amountRefunded">> & {
    lines?: Array<{ unitAmount?: number; lineTotal?: number }>;
  },
>(order: T) {
  const { subtotal: _s, delivery: _d, amountTotal: _t, amountRefunded: _r, lines, ...rest } = order;
  void _s;
  void _d;
  void _t;
  void _r;
  return {
    ...rest,
    lines: (lines ?? []).map(({ unitAmount: _u, lineTotal: _l, ...line }) => {
      void _u;
      void _l;
      return line;
    }),
  };
}
