import test from "node:test";
import assert from "node:assert/strict";

import { summariseFinance, bookingWithoutMoney, shopOrderWithoutMoney, dublinDate } from "../../lib/admin/finance.ts";

// Made-up orders only: example.com addresses, no real people.

const NOW = new Date("2026-11-27T15:00:00Z");

function booking(overrides = {}) {
  return {
    id: "P8-TEST0001",
    attemptKey: "a",
    sessionId: "s1",
    courseSlug: "cardiac-first-response",
    courseTitle: "Cardiac First Response",
    sessionDate: "2026-12-10",
    sessionStart: "09:30",
    sessionEnd: "16:30",
    sessionDays: 1,
    venue: "Dublin",
    delivery: "classroom",
    quantity: 2,
    unitAmount: 9500,
    amountTotal: 19000,
    currency: "eur",
    buyer: { name: "Sample Buyer", email: "buyer@example.com", phone: "0000000" },
    status: "paid",
    livemode: true,
    holdExpiresAt: "2026-11-20T10:30:00Z",
    createdAt: "2026-11-20T10:00:00Z",
    paidAt: "2026-11-20T10:05:00Z",
    emails: { customer: { status: "sent", attempts: 1 }, staff: { status: "sent", attempts: 1 } },
    ...overrides,
  };
}

function shop(overrides = {}) {
  return {
    id: "S8-TEST0001",
    attemptKey: "b",
    mode: "payment",
    lines: [
      { slug: "gloves", name: "Nitrile gloves", quantity: 2, unitAmount: 1000, lineTotal: 2000 },
      { slug: "kit", name: "First aid kit", quantity: 1, unitAmount: 3000, lineTotal: 3000 },
    ],
    subtotal: 5000,
    delivery: 1000,
    amountTotal: 6000,
    currency: "eur",
    customer: { name: "Sample Shopper", email: "shop@example.com", phone: "", organisation: "Example Ltd", address: "", eircode: "", notes: "" },
    status: "paid",
    livemode: true,
    createdAt: "2026-11-25T09:00:00Z",
    paidAt: "2026-11-25T09:02:00Z",
    emails: { customer: { status: "sent", attempts: 1 }, staff: { status: "sent", attempts: 1 } },
    ...overrides,
  };
}

test("sums paid bookings, Blended Learning and shop by source", () => {
  const summary = summariseFinance(
    {
      orders: [
        booking(),
        booking({ id: "P8-BL1", courseSlug: "far", courseTitle: "PHECC First Aid Response", quantity: 1, amountTotal: 15000, blended: { courseId: "c", courseSlug: "far", sessionId: "x", attendees: [], deliveries: {} } }),
      ],
      shopOrders: [shop()],
    },
    { range: "30d", now: NOW },
  );
  assert.equal(summary.mode, "live");
  assert.equal(summary.totals.net, 19000 + 15000 + 6000);
  assert.equal(summary.totals.payments, 3);
  assert.equal(summary.totals.averageOrder, Math.round(40000 / 3));
  const by = Object.fromEntries(summary.bySource.map((s) => [s.source, s.net]));
  assert.deepEqual(by, { classroom: 19000, blended: 15000, shop: 6000 });
  assert.equal(summary.periods.length, 30);
  assert.equal(summary.periods.reduce((t, p) => t + p.total, 0), 40000);
  assert.equal(summary.topCourses[0].title, "Cardiac First Response");
  assert.equal(summary.topCourses[0].places, 2);
  assert.equal(summary.topProducts[0].title, "First aid kit");
});

test("leaves out money not yet taken, and counts what is in flight", () => {
  const summary = summariseFinance(
    {
      orders: [
        booking({ id: "a", status: "pending" }),
        booking({ id: "b", status: "expired" }),
        booking({ id: "c", status: "failed" }),
        booking({ id: "d", status: "processing" }),
        booking({ id: "e", status: "exception" }),
      ],
      shopOrders: [shop({ id: "f", mode: "request", status: "requested" })],
    },
    { range: "12m", now: NOW },
  );
  assert.equal(summary.totals.payments, 1, "only the exception (money taken) counts");
  assert.equal(summary.attention.processing, 1);
  assert.equal(summary.attention.processingAmount, 19000);
  assert.equal(summary.attention.exceptions, 1);
});

test("refunds come off the payment, shared across shop lines", () => {
  const summary = summariseFinance(
    {
      orders: [booking({ status: "refunded", amountRefunded: 19000 }), booking({ id: "p", amountRefunded: 9500 })],
      shopOrders: [shop({ amountRefunded: 3000 })],
    },
    { range: "90d", now: NOW },
  );
  assert.equal(summary.totals.gross, 19000 * 2 + 6000);
  assert.equal(summary.totals.refunded, 19000 + 9500 + 3000);
  assert.equal(summary.totals.net, 9500 + 3000);
  assert.equal(summary.granularity, "week");
  const lines = summary.topProducts.reduce((t, p) => t + p.net, 0);
  assert.ok(lines <= 3000, "line nets never exceed what was kept");
});

test("a fully refunded booking with no amountRefunded recorded counts as zero", () => {
  const summary = summariseFinance({ orders: [booking({ status: "refunded" })], shopOrders: [] }, { range: "all", now: NOW });
  assert.equal(summary.totals.net, 0);
  assert.equal(summary.totals.refunded, 19000);
});

test("test and live payments are never mixed; test shows until the first live one", () => {
  const onlyTest = summariseFinance({ orders: [booking({ livemode: false })], shopOrders: [] }, { range: "all", now: NOW });
  assert.equal(onlyTest.mode, "test");
  assert.equal(onlyTest.totals.net, 19000);
  assert.equal(onlyTest.hasLive, false);

  const both = summariseFinance({ orders: [booking({ livemode: false }), booking({ id: "L", amountTotal: 500 })], shopOrders: [] }, { range: "all", now: NOW });
  assert.equal(both.mode, "live");
  assert.equal(both.totals.net, 500);
  const asTest = summariseFinance({ orders: [booking({ livemode: false }), booking({ id: "L", amountTotal: 500 })], shopOrders: [] }, { range: "all", mode: "test", now: NOW });
  assert.equal(asTest.totals.net, 19000);
});

test("ranges, previous period and Irish days", () => {
  const old = booking({ id: "old", paidAt: "2026-09-01T10:00:00Z" });
  const recent = booking({ id: "new" });
  const thirty = summariseFinance({ orders: [old, recent], shopOrders: [] }, { range: "30d", now: NOW });
  assert.equal(thirty.totals.payments, 1);
  assert.equal(thirty.from, "2026-10-29");
  const twelve = summariseFinance({ orders: [old, recent], shopOrders: [] }, { range: "12m", now: NOW });
  assert.equal(twelve.periods.length, 12);
  assert.equal(twelve.periods.at(-1).key, "2026-11");
  assert.equal(twelve.totals.payments, 2);
  const prev = summariseFinance({ orders: [booking({ id: "p", paidAt: "2026-10-10T10:00:00Z" }), recent], shopOrders: [] }, { range: "30d", now: NOW });
  assert.equal(prev.previousNet, 19000);
  const all = summariseFinance({ orders: [], shopOrders: [] }, { range: "all", now: NOW });
  assert.equal(all.previousNet, null);
  assert.equal(all.totals.net, 0);
  // 23:30 UTC on 31 May is 00:30 on 1 June in Ireland (summer time).
  assert.equal(dublinDate("2026-05-31T23:30:00Z"), "2026-06-01");
});

test("staff views carry no amounts", () => {
  const b = bookingWithoutMoney(booking({ amountRefunded: 100 }));
  for (const key of ["unitAmount", "amountTotal", "amountRefunded"]) assert.equal(key in b, false, key);
  assert.equal(b.courseTitle, "Cardiac First Response");
  const s = shopOrderWithoutMoney(shop({ amountRefunded: 100 }));
  for (const key of ["subtotal", "delivery", "amountTotal", "amountRefunded"]) assert.equal(key in s, false, key);
  for (const line of s.lines) {
    assert.equal("unitAmount" in line, false);
    assert.equal("lineTotal" in line, false);
    assert.ok(line.name);
  }
});
