#!/usr/bin/env node
/**
 * End-to-end checks for the enquiry form, prices, calendar data, Stripe
 * Checkout and the webhook, against a production build in Stripe TEST mode.
 *
 *   npm run build && npm run check:booking
 *
 * Nothing leaves the machine: Stripe's API is replaced by a local mock (the
 * SDK is pointed at it, which the app allows for test keys only), webhook
 * events are signed locally with a throwaway secret, and email goes to a
 * JSON outbox in a temp folder. Real Stripe test-mode and real inbox checks
 * still need doing once Pulse 8's keys and sender domain exist.
 *
 * Pulse 8 Blended Learning (BL) is replaced by a local mock too: it serves a
 * course list (with prices only when the request is signed), takes signed
 * booking events, and can be told to fail. The whole run happens twice when
 * BOOKING_CHECK_DATABASE_URL names a throwaway Postgres database (its name
 * must contain "test"): once on the JSON file store, once on Postgres.
 */
import { spawn } from "node:child_process";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import Stripe from "stripe";

const PORT = 3200;
const MOCK_PORT = 12111;
const BASE = `http://localhost:${PORT}`;
const WEBHOOK_SECRET = "whsec_local_check_only";
const ADMIN_PASSWORD = "local-check";
const BL_PORT = 12112;
const BL_BASE = `http://localhost:${BL_PORT}`;
const BL_SECRET = "bl_local_check_only_0123456789abcdef";
const CRON_SECRET = "cron_local_check_only";

let passed = 0;
const failures = [];
let storeLabel = "";
function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`[${storeLabel}] ${name}`);
    console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------- Stripe mock
const mockCalls = [];
function lineTotal(params) {
  let total = 0;
  for (let i = 0; params.has(`line_items[${i}][quantity]`); i += 1) {
    total +=
      Number(params.get(`line_items[${i}][price_data][unit_amount]`)) * Number(params.get(`line_items[${i}][quantity]`));
  }
  return total;
}
const mock = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const params = new URLSearchParams(body);
    mockCalls.push({ path: req.url, params, idempotencyKey: req.headers["idempotency-key"] });
    if (req.method === "POST" && req.url === "/v1/checkout/sessions") {
      const id = `cs_test_${Math.random().toString(36).slice(2, 14)}${Date.now()}`;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id,
          object: "checkout.session",
          url: `https://checkout.stripe.test/c/pay/${id}`,
          expires_at: Number(params.get("expires_at")),
          // Stripe totals every line (a shop order has several).
          amount_total: lineTotal(params),
          currency: params.get("line_items[0][price_data][currency]"),
          metadata: params.has("metadata[shop_order_id]")
            ? { shop_order_id: params.get("metadata[shop_order_id]") }
            : { booking_id: params.get("metadata[booking_id]") },
        }),
      );
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "not mocked" } }));
  });
});

// ---------------------------------------------------------------- Blended Learning mock
const BL_IDS = {
  cpr: "a0000000-0000-4000-8000-000000000001",
  noPrice: "a0000000-0000-4000-8000-000000000002",
  far: "a0000000-0000-4000-8000-000000000003",
};
const blSign = (ts, payload, secret = BL_SECRET) =>
  `sha256=${createHmac("sha256", secret).update(`${ts}.${payload}`).digest("hex")}`;
function blSigned(headers, payload) {
  const ts = headers["x-pulse8-timestamp"];
  const given = Buffer.from(String(headers["x-pulse8-signature"] ?? ""));
  const expected = Buffer.from(blSign(ts, payload));
  return (
    Boolean(ts) &&
    Math.abs(Date.now() / 1000 - Number(ts)) <= 300 &&
    given.length === expected.length &&
    timingSafeEqual(given, expected)
  );
}
const blDayAt = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

let bl;
function blReset() {
  const day = (offset, left, capacity = 8) => ({
    starts_at: `${blDayAt(offset)}T09:00:00.000Z`,
    ends_at: `${blDayAt(offset)}T17:00:00.000Z`,
    venue_name: "Check Venue",
    venue_address: "Unit 9, Dublin 2",
    capacity,
    places_left: left,
  });
  bl = {
    /** "ok", or "fail" to answer every booking with 503 */
    mode: "ok",
    posts: [],
    seen: new Set(),
    gets: { signed: 0, unsigned: 0 },
    days: {
      dayA: day(15, 5),
      dayFull: day(16, 0),
      dayLast: day(17, 1),
      dayNoPrice: day(18, 6),
      dayCache: day(19, 9, 12),
      dayFar: day(20, 4),
    },
  };
}

function blCourseList(signed) {
  const days = (...ids) => ids.map((id) => ({ session_id: id, ...bl.days[id] }));
  const price = (cents) =>
    signed ? { price: cents === null ? null : { amount_cents: cents, currency: "eur" } } : {};
  const base = {
    image_url: null,
    delivery: "blended",
    length_label: "6 hours",
    stated_hours: 6,
    online_minutes: 240,
    requires_practical: true,
    certificate: { name: "PHECC Cardiac First Response", valid_for_months: 24, accrediting_body: "PHECC" },
    updated_at: new Date().toISOString(),
  };
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    courses: [
      {
        ...base,
        id: BL_IDS.cpr,
        slug: "bl-check-cpr",
        code: "CPR",
        title: "Check CPR and AED",
        summary: "CPR and AED, theory online.",
        description: "Learn CPR and AED use online first.\n\nThen practise it on the day.",
        practical_days: days("dayA", "dayFull", "dayLast"),
        ...price(6000),
      },
      {
        ...base,
        id: BL_IDS.noPrice,
        slug: "bl-check-noprice",
        code: "REC",
        title: "Check Recertification",
        summary: "No price set yet.",
        description: "",
        practical_days: days("dayNoPrice", "dayCache"),
        ...price(null),
      },
      {
        ...base,
        id: BL_IDS.far,
        slug: "first-aid-response",
        code: "FAR",
        title: "First Aid Response (BL title)",
        summary: "BL's own summary.",
        description: "BL's own description.",
        practical_days: days("dayFar"),
        ...price(29900),
      },
    ],
  };
}

const blMock = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const send = (status, value) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(value));
    };
    if (req.method === "GET" && req.url === "/api/integrations/courses") {
      const signed = blSigned(req.headers, "GET /api/integrations/courses");
      bl.gets[signed ? "signed" : "unsigned"] += 1;
      return send(200, blCourseList(signed));
    }
    if (req.method === "POST" && req.url === "/api/integrations/bookings") {
      if (bl.mode === "fail") return send(503, { status: "failed", error: "Mock outage" });
      if (!blSigned(req.headers, body)) return send(401, { error: "Invalid signature" });
      const event = JSON.parse(body);
      bl.posts.push(event);
      if (bl.seen.has(event.id)) return send(200, { status: "duplicate" });
      bl.seen.add(event.id);
      // Like BL: a confirmed booking takes its places, a refund gives them back.
      const day = bl.days[event.data.practical.session_id];
      const places = event.data.attendees?.length ?? 1;
      if (day && event.type === "booking.confirmed") day.places_left -= places;
      if (day && event.type === "booking.refunded") day.places_left += places;
      return send(200, { status: "processed" });
    }
    send(404, { error: "not mocked" });
  });
});

// ---------------------------------------------------------------- app server
const work = await mkdtemp(path.join(tmpdir(), "pulse8-check-"));
const contentFile = path.join(work, "site-content.json");
const dataDir = path.join(work, "data");
const outbox = path.join(dataDir, "outbox");
let storeEnv = {};

function isoInDays(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}
const DAY = isoInDays(12);
const SESSIONS = {
  cfr: { id: "extra-check-cfr", courseSlug: "cardiac-first-response", date: DAY, start: "09:00", days: 1, seatsLeft: 5, online: false },
  last: { id: "extra-check-last-seat", courseSlug: "basic-first-aid", date: DAY, start: "13:00", days: 1, seatsLeft: 1, online: false },
  fire: { id: "extra-check-fire", courseSlug: "fire-marshal", date: isoInDays(13), start: "10:00", days: 1, seatsLeft: 3, online: false },
  new: { id: "extra-check-epipen", courseSlug: "epipen", date: isoInDays(14), start: "10:00", days: 1, seatsLeft: 4, online: false },
};
await writeFile(contentFile, JSON.stringify({ extraSessions: Object.values(SESSIONS) }));

let server;
async function startApp(extraEnv = {}) {
  // Every start is cold: no course list cached by an earlier run.
  await rm(path.join(".next", "cache", "fetch-cache"), { recursive: true, force: true });
  // Run Next through node itself so this works on Windows too (no .bin shim).
  server = spawn(process.execPath, [path.join("node_modules", "next", "dist", "bin", "next"), "start", "-p", String(PORT)], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      SITE_URL: BASE,
      SITE_CONTENT_FILE: contentFile,
      BOOKING_DATA_DIR: dataDir,
      BOOKING_PAYMENTS_ENABLED: "1",
      STRIPE_SECRET_KEY: "sk_test_local_check_only",
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
      STRIPE_API_HOST: "localhost",
      STRIPE_API_PORT: String(MOCK_PORT),
      STRIPE_API_PROTOCOL: "http",
      MAIL_TRANSPORT: "outbox",
      ADMIN_PASSWORD,
      SCHEDULE_FIXTURES: "0",
      BLENDED_LEARNING_URL: BL_BASE,
      BLENDED_LEARNING_SECRET: BL_SECRET,
      BLENDED_LEARNING_COURSE_LINKS: `first-aid-response-blended=${BL_IDS.far}`,
      CRON_SECRET,
      ...storeEnv,
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stderr.on("data", () => {});
  server.stdout.on("data", () => {});
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`${BASE}/policies`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("app did not start");
}
async function stopApp() {
  if (!server) return;
  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("exit", resolve));
  server = undefined;
}

// ---------------------------------------------------------------- helpers
// A different client address per request, so the per-IP rate limits do not
// trip during the run. (Rate limiting itself is not under test here.)
let clientCounter = 0;
const json = (url, body, headers = {}) =>
  fetch(`${BASE}${url}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: BASE,
      "x-forwarded-for": `10.9.${Math.floor(++clientCounter / 250)}.${clientCounter % 250}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });

async function outboxMail() {
  try {
    const files = (await readdir(outbox)).sort();
    return Promise.all(files.map(async (file) => JSON.parse(await readFile(path.join(outbox, file), "utf8"))));
  } catch {
    return [];
  }
}

async function orders() {
  const response = await fetch(`${BASE}/api/admin/bookings`, { headers: adminAuth });
  return response.json();
}

// ---------------------------------------------------------------- staff sign-in
// The admin has per-person logins. ADMIN_PASSWORD only creates the first owner.
const OWNER = { name: "Check Owner", email: "owner.check@example.com", password: "owner-check-password" };
const STAFF = { name: "Check Staff", email: "staff.check@example.com", password: "staff-check-password" };
/** Cookie header for the signed-in owner; filled in by signInAsOwner. */
const adminAuth = {};

function sessionCookie(response) {
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith("p8_staff="));
  return cookie ? cookie.split(";")[0] : "";
}

async function signInAsOwner() {
  console.log("\nAdmin: first owner");
  let response = await json("/api/admin/auth/setup", { ...OWNER, setupPassword: "not-the-password" });
  check("first-owner set-up refuses a wrong set-up password", response.status === 401);
  response = await json("/api/admin/auth/setup", { ...OWNER, setupPassword: ADMIN_PASSWORD });
  adminAuth.cookie = sessionCookie(response);
  check("first owner created with ADMIN_PASSWORD, and signed in", response.status === 200 && adminAuth.cookie.length > 20);
  response = await json("/api/admin/auth/setup", { ...STAFF, setupPassword: ADMIN_PASSWORD });
  check("ADMIN_PASSWORD can't create a second owner", response.status === 409);
}

let eventCounter = 0;
function signedEvent(type, object, { livemode = false, id } = {}) {
  eventCounter += 1;
  const payload = JSON.stringify({
    id: id ?? `evt_check_${Date.now()}_${eventCounter}`,
    object: "event",
    type,
    livemode,
    created: Math.floor(Date.now() / 1000),
    data: { object: { object: "checkout.session", livemode, ...object } },
  });
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return { payload, header };
}
const postEvent = ({ payload, header }) =>
  fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "stripe-signature": header, "content-type": "application/json" },
    body: payload,
  });

const buyer = { name: "Aoife Brennan", email: "aoife.test@example.com", phone: "087 555 0142" };
const attempt = () => `attempt-${Math.random().toString(36).slice(2, 12)}`;

async function startCheckout(sessionId, extra = {}) {
  const response = await json("/api/checkout", { sessionId, quantity: 1, attemptKey: attempt(), ...buyer, ...extra });
  const body = await response.json().catch(() => ({}));
  const call = mockCalls.at(-1);
  return { response, body, call };
}

// ---------------------------------------------------------------- run
async function suite() {
  await startApp();
  await signInAsOwner();

  console.log("\nPublic pages and data");
  const pages = ["/", "/courses", "/courses/cardiac-first-response", "/courses/epipen", "/book", "/contact", "/courses/bl-check-cpr", "/courses/first-aid-response-blended"];
  for (const page of pages) {
    const html = await (await fetch(`${BASE}${page}`)).text();
    check(`${page} shows no euro course price`, !/€\s?\d|&euro;|\\u20ac\d|per person/i.test(html));
    check(`${page} carries no "price" field`, !/\\?"price\\?":/.test(html));
    check(`${page} carries no Blended Learning price`, !/\b(6000|29900|priceCents|amount_cents)\b/.test(html));
  }
  const home = await (await fetch(`${BASE}/`)).text();
  check("home has new H1", home.includes("First aid and safety training across Ireland"));
  check("old tagline gone", !/ambulance/i.test(home));
  check("hardcoded course count gone", !home.includes("Nineteen courses"));
  check("Trusted by follows the courses section", home.indexOf("Trusted by") > home.indexOf("Explore our training courses"));
  check("enquiry form is last before footer", home.lastIndexOf("home-enquiry-name") > home.indexOf("Trusted by"));
  const courses = await (await fetch(`${BASE}/courses`)).text();
  check("Medication anchor on catalogue", courses.includes('id="medication"'));
  for (const slug of ["cfr-epinephrine", "pmav-training", "evacuation-chair-training", "buccal-midazolam", "epipen"]) {
    const response = await fetch(`${BASE}/courses/${slug}`);
    check(`/courses/${slug} resolves`, response.ok);
  }
  const pmav = await (await fetch(`${BASE}/courses/pmav-training`)).text();
  check("course without dates offers enquiry", pmav.includes("Enquire about this course") && pmav.includes("/contact?course=pmav-training"));
  const book = await (await fetch(`${BASE}/book`)).text();
  check("/book heading", book.includes("Upcoming course dates"));
  check("/book has no sample dates when fixtures are off", !book.includes("sample-"));
  check("/book shows published test date", book.includes(SESSIONS.cfr.id));

  console.log("\nEnquiry email");
  let before = (await outboxMail()).length;
  let response = await json("/api/enquiry", {
    name: "Ciarán Ó Dálaigh", email: "  ciaran.test@example.com ", phone: "01 555 0199", company: "Test Club",
    bookingType: "Group", county: "Kildare", course: "epipen", message: "Ten staff.\nAny Tuesday.",
    consent: true, source: "/contact?course=epipen",
  });
  let mail = (await outboxMail()).slice(before);
  check("valid enquiry accepted", response.status === 200);
  check("one email written", mail.length === 1);
  check("To is info@pulse8.ie", mail[0]?.headers.To === "info@pulse8.ie");
  check("Reply-To is the trimmed customer email", mail[0]?.headers["Reply-To"] === "ciaran.test@example.com");
  check("From is the site sender, not the customer", !String(mail[0]?.headers.From).includes("ciaran"));
  check("Subject names the course", mail[0]?.headers.Subject === "New website enquiry | EpiPen Training");
  check("Body has source page", mail[0]?.text.includes("/contact?course=epipen"));

  before = (await outboxMail()).length;
  for (const [label, email] of [
    ["header injection", "a@example.com\r\nBcc: x@example.com"],
    ["two recipients", "a@example.com, b@example.com"],
    ["display name", "Evil <a@example.com>"],
    ["not an address", "nope"],
  ]) {
    response = await json("/api/enquiry", { ...buyer, email, county: "Dublin", consent: true });
    check(`rejects ${label}`, response.status === 400);
  }
  response = await json("/api/enquiry", { ...buyer, county: "Dublin", consent: true, course: "not-a-course" });
  check("rejects unknown course", response.status === 400);
  response = await json("/api/enquiry", { ...buyer, county: "Dublin", consent: false });
  check("rejects without consent", response.status === 400);
  check("invalid input sent nothing", (await outboxMail()).length === before);

  console.log("\nCheckout creation");
  const firstCalls = mockCalls.length;
  const tampered = await startCheckout(SESSIONS.cfr.id, { price: 1, unitAmount: 1, amount: 1 });
  check("checkout returns Stripe URL", tampered.response.status === 200 && tampered.body.url?.startsWith("https://checkout.stripe.test/"));
  check("amount comes from the server (CFR 95.00)", tampered.call?.params.get("line_items[0][price_data][unit_amount]") === "9500");
  check("currency eur", tampered.call?.params.get("line_items[0][price_data][currency]") === "eur");
  check("customer email captured", tampered.call?.params.get("customer_email") === buyer.email);
  check("booking id attached", /^P8-/.test(tampered.call?.params.get("metadata[booking_id]") ?? ""));
  check("idempotency key per booking", /^checkout-P8-/.test(tampered.call?.idempotencyKey ?? ""));
  check("success URL on allowlisted origin", tampered.call?.params.get("success_url")?.startsWith(`${BASE}/book/return?session_id=`));
  const expiresIn = Number(tampered.call?.params.get("expires_at")) - Date.now() / 1000;
  check("Checkout expires in about 30 minutes", expiresIn > 29 * 60 && expiresIn < 32 * 60);

  const evilOrigin = await json("/api/checkout", { sessionId: SESSIONS.cfr.id, quantity: 1, attemptKey: attempt(), ...buyer }, { origin: "https://evil.example" });
  await evilOrigin.json();
  check("foreign Origin falls back to SITE_URL", mockCalls.at(-1).params.get("success_url").startsWith(BASE));

  const key = attempt();
  const a = await json("/api/checkout", { sessionId: SESSIONS.cfr.id, quantity: 1, attemptKey: key, ...buyer });
  const callsAfterFirst = mockCalls.length;
  const b = await json("/api/checkout", { sessionId: SESSIONS.cfr.id, quantity: 1, attemptKey: key, ...buyer });
  const [aBody, bBody] = [await a.json(), await b.json()];
  check("repeat attempt reuses the same Checkout", aBody.url === bBody.url && mockCalls.length === callsAfterFirst);

  response = await json("/api/checkout", { sessionId: "sample-cardiac-first-response-2026-12-01-0900", quantity: 1, attemptKey: attempt(), ...buyer });
  check("sample/unpublished session refused", response.status === 409);
  response = await json("/api/checkout", { sessionId: SESSIONS.new.id, quantity: 1, attemptKey: attempt(), ...buyer });
  check("course with no server rate refused", response.status === 409);
  response = await json("/api/checkout", { sessionId: SESSIONS.cfr.id, quantity: 99, attemptKey: attempt(), ...buyer });
  check("over-limit quantity refused", response.status === 400);
  check("no Stripe call for refused requests", mockCalls.length === callsAfterFirst);

  const race = await Promise.all([startCheckout(SESSIONS.last.id), startCheckout(SESSIONS.last.id)]);
  const statuses = race.map((r) => r.response.status).sort();
  check("one seat, two buyers: one hold, one refusal", statuses[0] === 200 && statuses[1] === 409, statuses.join(","));
  console.log(`  (${mockCalls.length - firstCalls} Checkout Sessions created)`);

  console.log("\nWebhook");
  const list = await orders();
  const paidOrder = list.find((order) => order.checkoutSessionId && order.sessionId === SESSIONS.cfr.id);
  const bookingId = paidOrder.id;
  const completed = (extra = {}) => ({
    id: paidOrder.checkoutSessionId,
    payment_status: "paid",
    amount_total: paidOrder.amountTotal,
    currency: "eur",
    payment_intent: "pi_test_check",
    client_reference_id: bookingId,
    metadata: { booking_id: bookingId },
    ...extra,
  });

  response = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=deadbeef" },
    body: signedEvent("checkout.session.completed", completed()).payload,
  });
  check("bad signature rejected", response.status === 400);
  response = await postEvent(signedEvent("checkout.session.completed", completed(), { livemode: true }));
  check("live-mode event rejected for a test key", response.status === 400);
  check("nothing confirmed yet", (await orders()).find((o) => o.id === bookingId).status === "pending");

  const returnPending = await (await fetch(`${BASE}/book/return?session_id=${paidOrder.checkoutSessionId}`)).text();
  check("return page while pending", returnPending.includes("We’re confirming your payment") || returnPending.includes("We&rsquo;re confirming your payment"));

  before = (await outboxMail()).length;
  const event = signedEvent("checkout.session.completed", completed());
  response = await postEvent(event);
  check("paid event accepted", response.status === 200);
  let order = (await orders()).find((o) => o.id === bookingId);
  check("booking paid", order.status === "paid");
  mail = (await outboxMail()).slice(before);
  const customer = mail.filter((m) => m.headers.To === buyer.email);
  const staff = mail.filter((m) => m.headers.To === "info@pulse8.ie");
  check("one customer confirmation", customer.length === 1);
  check("customer subject", customer[0]?.headers.Subject === "Booking confirmed | Cardiac First Response");
  check("customer email has reference, amount, info@", customer[0]?.text.includes(bookingId) && customer[0]?.text.includes("€95.00") && customer[0]?.text.includes("info@pulse8.ie"));
  check("one staff notification", staff.length === 1);
  check("staff subject", staff[0]?.headers.Subject === `[TEST] Paid course booking | Cardiac First Response | ${bookingId}`);
  check("staff email has Stripe reference", staff[0]?.text.includes(paidOrder.checkoutSessionId));

  before = (await outboxMail()).length;
  response = await postEvent(event);
  const replay = await response.json();
  check("replayed event is a no-op", response.status === 200 && replay.duplicate === true);
  response = await postEvent(signedEvent("checkout.session.completed", completed()));
  check("second distinct paid event accepted", response.status === 200);
  check("no repeat emails", (await outboxMail()).length === before);
  const returnPaid = await (await fetch(`${BASE}/book/return?session_id=${paidOrder.checkoutSessionId}`)).text();
  check("return page confirmed", returnPaid.includes("Your booking is confirmed") && returnPaid.includes(bookingId));
  check("refreshing return page sends nothing", (await outboxMail()).length === before);
  const forged = await (await fetch(`${BASE}/book/return?session_id=cs_test_forged000000`)).text();
  check("forged return URL shows nothing", forged.includes("couldn’t find that booking") || forged.includes("couldn&rsquo;t find that booking"));
  const seats = (await (await fetch(`${BASE}/book?course=cardiac-first-response`)).text());
  // 5 released, 1 paid, 2 still held in Checkout (the second and the repeat attempt).
  check("seat count reflects paid booking and live holds", seats.includes("2 places left"));

  // Delayed payment, then failure.
  const fire = await startCheckout(SESSIONS.fire.id);
  const fireOrder = (await orders()).find((o) => o.checkoutSessionId === fire.body.url.split("/").pop());
  const fireObj = { id: fireOrder.checkoutSessionId, amount_total: fireOrder.amountTotal, currency: "eur", metadata: { booking_id: fireOrder.id } };
  before = (await outboxMail()).length;
  await postEvent(signedEvent("checkout.session.completed", { ...fireObj, payment_status: "unpaid" }));
  check("delayed payment stays pending", (await orders()).find((o) => o.id === fireOrder.id).status === "processing");
  await postEvent(signedEvent("checkout.session.async_payment_failed", { ...fireObj, payment_status: "unpaid" }));
  check("failed delayed payment releases the seat", (await orders()).find((o) => o.id === fireOrder.id).status === "failed");
  check("no confirmation for pending or failed", (await outboxMail()).length === before);

  // Expiry releases the last seat.
  const lastOrder = (await orders()).find((o) => o.sessionId === SESSIONS.last.id && o.status === "pending");
  await postEvent(signedEvent("checkout.session.expired", { id: lastOrder.checkoutSessionId, payment_status: "unpaid", metadata: { booking_id: lastOrder.id } }));
  check("expired Checkout releases the hold", (await orders()).find((o) => o.id === lastOrder.id).status === "expired");
  const again = await startCheckout(SESSIONS.last.id);
  check("released seat can be booked again", again.response.status === 200);

  // Tampered amount reported by Stripe.
  const mismatchOrder = (await orders()).find((o) => o.checkoutSessionId === again.body.url.split("/").pop());
  before = (await outboxMail()).length;
  await postEvent(signedEvent("checkout.session.completed", {
    id: mismatchOrder.checkoutSessionId, payment_status: "paid", amount_total: 100, currency: "eur",
    metadata: { booking_id: mismatchOrder.id },
  }));
  order = (await orders()).find((o) => o.id === mismatchOrder.id);
  mail = (await outboxMail()).slice(before);
  check("amount mismatch flagged, not confirmed", order.status === "exception");
  check("mismatch: staff told, customer not", mail.length === 1 && mail[0].headers.Subject.includes("needs review"));

  await stopApp();

  console.log("\nEmail provider failure");
  await startApp({ MAIL_TRANSPORT: "fail" });
  response = await json("/api/enquiry", { ...buyer, county: "Dublin", consent: true });
  const failBody = await response.json();
  check("enquiry reports failure, not success", response.status === 502 && failBody.error === "We couldn’t send your enquiry. Please try again or email info@pulse8.ie.");
  const failCheckout = await startCheckout(SESSIONS.cfr.id);
  const failOrder = (await orders()).find((o) => o.checkoutSessionId === failCheckout.body.url.split("/").pop());
  response = await postEvent(signedEvent("checkout.session.completed", {
    id: failOrder.checkoutSessionId, payment_status: "paid", amount_total: failOrder.amountTotal, currency: "eur",
    payment_intent: "pi_test_fail", metadata: { booking_id: failOrder.id },
  }));
  order = (await orders()).find((o) => o.id === failOrder.id);
  check("booking persists when email fails", response.status === 200 && order.status === "paid");
  check("both email records failed and visible", order.emails.customer.status === "failed" && order.emails.staff.status === "failed");
  await stopApp();

  await startApp();
  before = (await outboxMail()).length;
  const auth = adminAuth;
  response = await json(`/api/admin/bookings/${failOrder.id}/emails`, { kind: "staff" }, auth);
  order = (await orders()).find((o) => o.id === failOrder.id);
  check("staff email retried on its own", response.status === 200 && order.emails.staff.status === "sent" && order.emails.customer.status === "failed");
  response = await json(`/api/admin/bookings/${failOrder.id}/emails`, { kind: "customer" }, auth);
  order = (await orders()).find((o) => o.id === failOrder.id);
  check("customer email retried on its own", response.status === 200 && order.emails.customer.status === "sent");
  check("exactly two messages sent by the retries", (await outboxMail()).length === before + 2);
  response = await json(`/api/admin/bookings/${failOrder.id}/emails`, { kind: "staff" });
  check("retry endpoint needs admin auth", response.status === 401);

  await blendedChecks({ paidOrder, failOrder });
  await shopChecks();
  await adminChecks();
}

const page = async (url) => (await fetch(`${BASE}${url}`)).text();
const orderById = async (id) => (await orders()).find((order) => order.id === id);
const outboxSince = async (count) => (await outboxMail()).slice(count);

/** A field of one session in the page's serialised props, e.g. seatsLeft or action. */
function sessionField(html, id, field) {
  const pattern = new RegExp(`\\\\?"id\\\\?":\\\\?"${id}\\\\?"[^{}]*?\\\\?"${field}\\\\?":\\\\?"?([A-Za-z0-9_-]+)`);
  return html.match(pattern)?.[1];
}

const people = (count) =>
  Array.from({ length: count }, (_, index) => ({
    firstName: `Test${index + 1}`,
    lastName: "Attendee",
    email: `attendee${index + 1}.test@example.com`,
  }));

/** Stripe reports the Checkout for `order` as paid. */
function paidEvent(order) {
  return signedEvent("checkout.session.completed", {
    id: order.checkoutSessionId,
    payment_status: "paid",
    amount_total: order.amountTotal,
    currency: "eur",
    payment_intent: `pi_test_${order.id}`,
    metadata: { booking_id: order.id },
  });
}

/** Stripe's charge.refunded, with Stripe's running refunded total. */
function refundEvent(order, amountRefunded, intent = order.paymentIntentId) {
  return signedEvent("charge.refunded", {
    object: "charge",
    id: `ch_test_${order.id}`,
    payment_intent: intent,
    amount: order.amountTotal,
    amount_refunded: amountRefunded,
    refunded: amountRefunded >= order.amountTotal,
    currency: "eur",
  });
}

function courseChanged(body, { ts = Math.floor(Date.now() / 1000), secret = BL_SECRET, unsigned = false } = {}) {
  return fetch(`${BASE}/api/integrations/blended-learning`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(unsigned ? {} : { "x-pulse8-timestamp": String(ts), "x-pulse8-signature": blSign(ts, body, secret) }),
    },
    body,
  });
}

async function bookBlended(sessionId, attendees) {
  const started = await startCheckout(sessionId, { quantity: attendees.length, attendees });
  const order = (await orders()).find((o) => o.checkoutSessionId === started.body.url?.split("/").pop());
  return { ...started, order };
}

async function blendedChecks({ paidOrder, failOrder }) {
  let response;
  let before;

  console.log("\nBlended Learning: course list and pages");
  const book = await page("/book");
  check("course list is read signed, never unsigned", bl.gets.signed > 0 && bl.gets.unsigned === 0);
  check("/book shows BL practical days", book.includes("bl_dayA") && book.includes("bl_dayFar"));
  check("/book shows the BL venue", book.includes("Check Venue, Unit 9, Dublin 2"));
  check("BL day with a BL price offers booking", sessionField(book, "bl_dayA", "action") === "book");
  check("BL day with no price offers enquiry", sessionField(book, "bl_dayNoPrice", "action") === "enquire");
  check("full BL day offers enquiry", sessionField(book, "bl_dayFull", "action") === "enquire");
  check("BL day places come from BL", sessionField(book, "bl_dayA", "seatsLeft") === "5");
  const catalogue = await page("/courses");
  check("/courses has the Blended learning section", catalogue.includes('id="blended-learning"'));
  check("BL-only course is listed", catalogue.includes("Check CPR and AED"));
  check("linked BL course is not listed twice", !catalogue.includes("First Aid Response (BL title)"));
  const generated = await fetch(`${BASE}/courses/bl-check-cpr`);
  const generatedHtml = await generated.text();
  check("BL-only course gets a page from the feed", generated.ok && generatedHtml.includes("Then practise it on the day."));
  check("generated page lists its BL days", generatedHtml.includes("bl_dayA"));
  check("generated page says the sign-in is emailed", generatedHtml.includes("sign-in to Pulse 8 Blended Learning"));
  const linked = await page("/courses/first-aid-response-blended");
  check("linked course keeps its own page", linked.includes("PHECC registered instructor"));
  check("linked course shows BL days", linked.includes("bl_dayFar"));
  check("old e-learning portal wording gone", !linked.includes("Pulse 8 e-learning portal"));
  check("menu leads to the Blended learning section", (await page("/")).includes("/courses#blended-learning"));

  console.log("\nBlended Learning: checkout");
  const callsBefore = mockCalls.length;
  const one = people(1)[0];
  for (const [label, attendees] of [
    ["missing attendees", undefined],
    ["fewer attendees than places", people(1)],
    ["duplicate attendee email", [one, { ...people(2)[1], email: "ATTENDEE1.test@example.com" }]],
    ["attendee without a first name", [{ ...one, firstName: "  " }, people(2)[1]]],
    ["attendee with a bad email", [one, { ...people(2)[1], email: "not-an-email" }]],
    ["attendee email with a header", [one, { ...people(2)[1], email: "a@example.com\r\nBcc: x@example.com" }]],
  ]) {
    response = await json("/api/checkout", { sessionId: "bl_dayA", quantity: 2, attemptKey: attempt(), ...buyer, attendees });
    check(`rejects ${label}`, response.status === 400);
  }
  response = await json("/api/checkout", { sessionId: "bl_dayNoPrice", quantity: 1, attemptKey: attempt(), ...buyer, attendees: people(1) });
  check("BL day with no price refused (enquire instead)", response.status === 409);
  response = await json("/api/checkout", { sessionId: "bl_dayFull", quantity: 1, attemptKey: attempt(), ...buyer, attendees: people(1) });
  check("full BL day refused", response.status === 409);
  response = await json("/api/checkout", { sessionId: "bl_unknown", quantity: 1, attemptKey: attempt(), ...buyer, attendees: people(1) });
  check("unknown BL day refused", response.status === 409);
  // BL sells the last place elsewhere. The page's cached list still says 1; checkout reads BL fresh.
  bl.days.dayLast.places_left = 0;
  check("pages keep the cached list", sessionField(await page("/book"), "bl_dayLast", "seatsLeft") === "1");
  response = await json("/api/checkout", { sessionId: "bl_dayLast", quantity: 1, attemptKey: attempt(), ...buyer, attendees: people(1) });
  check("checkout re-reads BL: last place gone, refused", response.status === 409);
  check("no Stripe call for refused BL requests", mockCalls.length === callsBefore);

  const group = await bookBlended("bl_dayA", people(2));
  check("BL checkout returns a Stripe URL", group.response.status === 200);
  check("amount from BL's price (60.00 x 2)", group.call?.params.get("line_items[0][price_data][unit_amount]") === "6000" && group.call?.params.get("line_items[0][quantity]") === "2");
  check("order keeps attendees and BL ids", group.order?.blended?.attendees.length === 2 && group.order.blended.sessionId === "dayA" && group.order.blended.courseId === BL_IDS.cpr && group.order.blended.courseSlug === "bl-check-cpr");
  const far = await bookBlended("bl_dayFar", people(1));
  check("linked course priced by BL, not the website rate", far.call?.params.get("line_items[0][price_data][unit_amount]") === "29900");
  check("linked course booked under BL's slug", far.order?.blended?.courseSlug === "first-aid-response");

  console.log("\nBlended Learning: paid bookings");
  before = (await outboxMail()).length;
  let posts = bl.posts.length;
  const groupPaid = paidEvent(group.order);
  response = await postEvent(groupPaid);
  let order = await orderById(group.order.id);
  const sent = bl.posts.slice(posts);
  const data = sent[0]?.data ?? {};
  check("BL booking paid", response.status === 200 && order.status === "paid");
  check("one signed booking.confirmed sent to BL", sent.length === 1 && sent[0].type === "booking.confirmed");
  check("event id web_<order>_confirmed", sent[0]?.id === `web_${group.order.id}_confirmed`);
  check(
    "booking fields per the contract",
    data.booking_id === group.order.id && data.course_slug === "bl-check-cpr" && data.payment_status === "paid" &&
      data.practical?.session_id === "dayA" && data.amount_paid_cents === 12000,
  );
  check("buyer is the learner", data.learner?.email === buyer.email && data.learner?.first_name === "Aoife" && data.learner?.last_name === "Brennan");
  check("every attendee sent", data.attendees?.length === 2 && data.attendees[1].email === "attendee2.test@example.com" && data.attendees[1].first_name === "Test2" && data.attendees[1].last_name === "Attendee");
  check("delivery recorded on the order", order.blended.deliveries.confirmed.status === "sent" && order.blended.deliveries.confirmed.attempts === 1);
  let mail = await outboxSince(before);
  const receipt = mail.find((m) => m.headers.To === buyer.email);
  check("buyer still gets the website receipt", receipt?.headers.Subject === "Booking confirmed | Check CPR and AED");
  check("receipt names attendees and BL sign-in", receipt?.text.includes("attendee2.test@example.com") && receipt?.text.includes("Pulse 8 Blended Learning"));
  posts = bl.posts.length;
  await postEvent(groupPaid);
  await postEvent(paidEvent(order));
  check("replayed and repeated paid events send BL nothing more", bl.posts.length === posts);

  console.log("\nBlended Learning: course changes");
  const message = JSON.stringify({ id: "evt_check_changed", type: "course.changed", data: { course_id: BL_IDS.cpr, change: "practical_days_changed", listed: true } });
  // Fill the cache first (the app may have just restarted), then change BL behind it.
  const primed = await page("/book");
  check("course list cached", sessionField(primed, "bl_dayCache", "seatsLeft") === "9");
  bl.days.dayCache.places_left = 4;
  check("cached dates kept until BL says so", sessionField(await page("/book"), "bl_dayCache", "seatsLeft") === "9");
  response = await courseChanged(message, { unsigned: true });
  check("unsigned course change refused", response.status === 401);
  response = await courseChanged(message, { secret: "wrong_secret_0123456789abcdef" });
  check("wrongly signed course change refused", response.status === 401);
  response = await courseChanged(message, { ts: Math.floor(Date.now() / 1000) - 301 });
  check("stale course change refused", response.status === 401);
  const tampered = await fetch(`${BASE}/api/integrations/blended-learning`, {
    method: "POST",
    headers: { "x-pulse8-timestamp": String(Math.floor(Date.now() / 1000)), "x-pulse8-signature": blSign(Math.floor(Date.now() / 1000), message) },
    body: `${message} `,
  });
  check("body changed after signing refused", tampered.status === 401);
  check("refused messages change nothing", sessionField(await page("/book"), "bl_dayCache", "seatsLeft") === "9");
  response = await courseChanged(message);
  const answer = await response.json().catch(() => ({}));
  check("signed course change accepted", response.status === 200 && answer.ok === true);
  const refreshed = await page("/book");
  check("course change refreshes the dates", sessionField(refreshed, "bl_dayCache", "seatsLeft") === "4");
  check("BL's own count now includes the paid group (5 - 2)", sessionField(refreshed, "bl_dayA", "seatsLeft") === "3");
  check("last place sold elsewhere now shows full", sessionField(refreshed, "bl_dayLast", "action") === "enquire");

  console.log("\nBlended Learning: BL down at payment, then retry");
  bl.mode = "fail";
  before = (await outboxMail()).length;
  const single = await bookBlended("bl_dayA", people(1));
  response = await postEvent(paidEvent(single.order));
  order = await orderById(single.order.id);
  check("booking stays paid when BL fails", response.status === 200 && order.status === "paid");
  check("failed delivery recorded", order.blended.deliveries.confirmed.status === "failed" && order.blended.deliveries.confirmed.attempts === 1);
  check("receipt sent anyway", (await outboxSince(before)).some((m) => m.headers.To === buyer.email));
  check("undelivered booking still holds its place", sessionField(await page("/book"), "bl_dayA", "seatsLeft") === "2");
  bl.mode = "ok";
  response = await fetch(`${BASE}/api/cron/blended-learning`);
  check("retry cron needs its secret", response.status === 401);
  response = await fetch(`${BASE}/api/cron/blended-learning`, { headers: { authorization: "Bearer nope" } });
  check("retry cron refuses a wrong secret", response.status === 401);
  posts = bl.posts.length;
  response = await fetch(`${BASE}/api/cron/blended-learning`, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  let summary = await response.json().catch(() => ({}));
  order = await orderById(single.order.id);
  check("cron delivers it", response.status === 200 && summary.delivered === 1 && order.blended.deliveries.confirmed.status === "sent");
  check("retry uses the same event id", bl.posts.at(-1)?.id === `web_${single.order.id}_confirmed` && bl.posts.length === posts + 1);
  response = await fetch(`${BASE}/api/cron/blended-learning`, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  summary = await response.json().catch(() => ({}));
  check("nothing left to retry", summary.attempted === 0);

  bl.mode = "fail";
  await postEvent(paidEvent(far.order));
  bl.mode = "ok";
  response = await json(`/api/admin/bookings/${far.order.id}/blended-learning`, {});
  check("staff retry needs admin auth", response.status === 401);
  response = await json(`/api/admin/bookings/${far.order.id}/blended-learning`, {}, adminAuth);
  order = await orderById(far.order.id);
  check("staff retry delivers it", response.status === 200 && order.blended.deliveries.confirmed.status === "sent" && order.blended.deliveries.confirmed.attempts === 2);
  response = await json(`/api/admin/bookings/${far.order.id}/blended-learning`, { kind: "confirmed" }, adminAuth);
  const again = await response.json().catch(() => ({}));
  check("staff retry of a delivered event is a no-op", response.status === 200 && again.alreadySent === true);
  response = await json(`/api/admin/bookings/${paidOrder.id}/blended-learning`, {}, adminAuth);
  check("staff retry refuses a non-BL booking", response.status === 409);

  console.log("\nRefunds");
  // Full refund of a BL group booking.
  order = await orderById(group.order.id);
  posts = bl.posts.length;
  const fullRefund = refundEvent(order, order.amountTotal);
  response = await postEvent(fullRefund);
  order = await orderById(group.order.id);
  check("full refund marks the booking refunded", response.status === 200 && order.status === "refunded" && order.amountRefunded === 12000);
  const refundPost = bl.posts.slice(posts);
  check("one booking.refunded sent to BL", refundPost.length === 1 && refundPost[0].type === "booking.refunded" && refundPost[0].id === `web_${group.order.id}_refunded`);
  check("refund names the booking and every attendee", refundPost[0]?.data.booking_id === group.order.id && refundPost[0]?.data.attendees.length === 2);
  check("refund delivery recorded", order.blended.deliveries.refunded?.status === "sent");
  posts = bl.posts.length;
  response = await postEvent(fullRefund);
  check("replayed refund is a no-op", response.status === 200 && (await response.json()).duplicate === true);
  await postEvent(refundEvent(order, order.amountTotal));
  check("repeat refund event sends BL nothing more", bl.posts.length === posts);
  await courseChanged(message);
  check("refunded places come back on the website", sessionField(await page("/book"), "bl_dayA", "seatsLeft") === "4");

  // Full refund of an ordinary website booking frees its place.
  const cfrBefore = Number(sessionField(await page("/book"), SESSIONS.cfr.id, "seatsLeft"));
  order = await orderById(paidOrder.id);
  response = await postEvent(refundEvent(order, order.amountTotal));
  order = await orderById(paidOrder.id);
  check("full refund of a website booking", response.status === 200 && order.status === "refunded");
  check("its place is free again", Number(sessionField(await page("/book"), SESSIONS.cfr.id, "seatsLeft")) === cfrBefore + 1);

  // Partial refund: staff review only.
  order = await orderById(failOrder.id);
  before = (await outboxMail()).length;
  posts = bl.posts.length;
  const partial = refundEvent(order, 4750);
  response = await postEvent(partial);
  order = await orderById(failOrder.id);
  mail = await outboxSince(before);
  check("partial refund leaves the booking paid", response.status === 200 && order.status === "paid");
  check("partial refund: one staff review email", mail.length === 1 && mail[0].headers.To === "info@pulse8.ie" && mail[0].headers.Subject === `[TEST] Part refund needs review | Cardiac First Response | ${failOrder.id}`);
  check("review email has the refunded amount", mail[0]?.text.includes("€47.50"));
  await postEvent(partial);
  await postEvent(refundEvent(order, 4750));
  check("partial refund replay and repeat send nothing more", (await outboxMail()).length === before + 1);
  order = await orderById(single.order.id);
  await postEvent(refundEvent(order, 1000));
  check("partial refund of a BL booking tells BL nothing", bl.posts.length === posts && (await orderById(single.order.id)).status === "paid");
  response = await postEvent(refundEvent(order, order.amountTotal, "pi_test_not_ours"));
  check("refund for an unknown payment is ignored", response.status === 200 && (await orderById(single.order.id)).status === "paid");

  await stopApp();

  console.log("\nBlended Learning unreachable");
  await startApp({ BLENDED_LEARNING_URL: "http://localhost:12199" });
  const down = await fetch(`${BASE}/book`);
  const downHtml = await down.text();
  check("/book works with BL down", down.ok && downHtml.includes(SESSIONS.cfr.id));
  check("blended dates simply hidden", !downHtml.includes("bl_day"));
  check("/courses works with BL down", (await fetch(`${BASE}/courses`)).ok);
  check("linked course page works with BL down", (await fetch(`${BASE}/courses/first-aid-response-blended`)).ok);
  check("generated page is gone, not an error", (await fetch(`${BASE}/courses/bl-check-cpr`)).status === 404);
  response = await json("/api/checkout", { sessionId: "bl_dayA", quantity: 1, attemptKey: attempt(), ...buyer, attendees: people(1) });
  check("BL checkout refused while BL is down", response.status === 409);
  await stopApp();

  console.log("\nBlended Learning not configured");
  await startApp({ BLENDED_LEARNING_URL: "", BLENDED_LEARNING_SECRET: "" });
  const off = await page("/book");
  check("no blended dates, nothing breaks", off.includes(SESSIONS.cfr.id) && !off.includes("bl_day"));
  response = await fetch(`${BASE}/api/integrations/blended-learning`, { method: "POST", body: message });
  check("course-change endpoint closed when unconfigured", response.status === 503);
}

// ---------------------------------------------------------------- shop and student login
const shopOrders = async () =>
  (await fetch(`${BASE}/api/admin/shop-orders`, { headers: adminAuth })).json();
const shopById = async (id) => (await shopOrders()).find((order) => order.id === id);
const customer = {
  name: "Niamh Doyle",
  email: "niamh.test@example.com",
  phone: "086 555 0199",
  organisation: "Check GAA Club",
  address: "1 Test Road\nDublin 8",
  eircode: "d08 x2y4",
  notes: "",
  consent: true,
};
const MINDRAY = "mindray-beneheart-c1a-defibrillator";
const GLOVES = "nitrile-gloves-100s-medical-grade";
const basket = [
  { slug: MINDRAY, quantity: 2 },
  { slug: GLOVES, option: "M", quantity: 3 },
];
const BASKET_TOTAL = 2 * 129500 + 3 * 995;
const isRedirect = (status) => [303, 307, 308].includes(status);

async function placeShopOrder(extra = {}) {
  const callsBefore = mockCalls.length;
  const response = await json("/api/shop/checkout", { attemptKey: attempt(), lines: basket, ...customer, ...extra });
  const body = await response.json().catch(() => ({}));
  const call = mockCalls.length > callsBefore ? mockCalls.at(-1) : undefined;
  const checkoutId = body.url?.split("/").pop();
  const order = checkoutId ? (await shopOrders()).find((o) => o.checkoutSessionId === checkoutId) : undefined;
  return { response, body, call, order };
}

function shopCheckoutEvent(type, order, overrides = {}) {
  return signedEvent(type, {
    id: order.checkoutSessionId,
    payment_status: "paid",
    amount_total: order.amountTotal,
    currency: "eur",
    payment_intent: `pi_test_${order.id}`,
    metadata: { shop_order_id: order.id },
    ...overrides,
  });
}

async function shopChecks() {
  console.log("\nStudent login");
  // The app from the last blended section has BL switched off.
  let response = await fetch(`${BASE}/student-login/blended`, { redirect: "manual" });
  check(
    "BL sign-in falls back to blended courses while BL is unset",
    isRedirect(response.status) && Boolean(response.headers.get("location")?.endsWith("/courses#blended-learning")),
  );
  await stopApp();

  await startApp();
  response = await fetch(`${BASE}/student-login/blended`, { redirect: "manual" });
  check("BL sign-in redirects to BL's /login", isRedirect(response.status) && response.headers.get("location") === `${BL_BASE}/login`);
  const home = await page("/");
  check("header has the Student login menu", home.includes("Student login") && home.includes("/student-login/blended"));
  check("menu links the Videotile learner login", home.includes("https://www.videotilehost.com/pulse8/index.php"));
  check("menu links the classroom join page", home.includes("https://www.p8courses.com/"));

  console.log("\nShop checkout (payments on)");
  const bookingsBefore = (await orders()).length;
  const placed = await placeShopOrder({
    // Prices the browser might send are ignored: only slug, option and quantity count.
    lines: basket.map((line) => ({ ...line, price: 0.01, unitAmount: 1, lineTotal: 1 })),
  });
  check(
    "shop order starts Stripe Checkout",
    placed.response.status === 200 && typeof placed.body.url === "string" && placed.call?.path === "/v1/checkout/sessions",
  );
  const p = placed.call?.params;
  check("line 1 priced from the catalogue (1,295.00 x 2)", p?.get("line_items[0][price_data][unit_amount]") === "129500" && p?.get("line_items[0][quantity]") === "2");
  check("line 2 priced from the catalogue (9.95 x 3)", p?.get("line_items[1][price_data][unit_amount]") === "995" && p?.get("line_items[1][quantity]") === "3");
  check("option named on the Stripe line", Boolean(p?.get("line_items[1][price_data][product_data][name]")?.includes("(Size: M)")));
  check("no delivery line while delivery is 0", !p?.has("line_items[2][quantity]"));
  check("Checkout tagged as a shop order, not a booking", Boolean(p?.has("metadata[shop_order_id]")) && !p?.has("metadata[booking_id]"));
  check("returns to /cart/return", Boolean(p?.get("success_url")?.startsWith(`${BASE}/cart/return?session_id=`)));
  const shop = placed.order;
  check("order recorded pending with the server's total", shop?.status === "pending" && shop?.amountTotal === BASKET_TOTAL && shop?.delivery === 0);
  check("Eircode tidied", shop?.customer.eircode === "D08 X2Y4");
  check("no booking created by a shop order", (await orders()).length === bookingsBefore);

  const repeatKey = attempt();
  const first = await json("/api/shop/checkout", { attemptKey: repeatKey, lines: basket, ...customer });
  const callsAfterFirst = mockCalls.length;
  const second = await json("/api/shop/checkout", { attemptKey: repeatKey, lines: basket, ...customer });
  check("double submit reuses the same Checkout", (await first.json()).url === (await second.json()).url && mockCalls.length === callsAfterFirst);

  const refused = async (name, extra) => {
    const callsBefore = mockCalls.length;
    const result = await json("/api/shop/checkout", { attemptKey: attempt(), lines: basket, ...customer, ...extra });
    check(name, result.status === 400 && mockCalls.length === callsBefore, `status ${result.status}`);
  };
  await refused("unknown product refused", { lines: [{ slug: "not-a-product", quantity: 1 }] });
  await refused("missing size refused", { lines: [{ slug: GLOVES, quantity: 1 }] });
  await refused("size not on offer refused", { lines: [{ slug: GLOVES, option: "XXL", quantity: 1 }] });
  await refused("option on a product without options refused", { lines: [{ slug: MINDRAY, option: "M", quantity: 1 }] });
  await refused("quantity 0 refused", { lines: [{ slug: MINDRAY, quantity: 0 }] });
  await refused("quantity 100 refused", { lines: [{ slug: MINDRAY, quantity: 100 }] });
  await refused("fractional quantity refused", { lines: [{ slug: MINDRAY, quantity: 1.5 }] });
  await refused("empty basket refused", { lines: [] });
  await refused("bad Eircode refused", { eircode: "12345" });
  await refused("missing consent refused", { consent: false });
  await refused("header injection in name refused", { name: "Niamh\r\nBcc: x@example.com" });

  let mailBefore = (await outboxMail()).length;
  response = await postEvent(shopCheckoutEvent("checkout.session.completed", shop));
  let order = await shopById(shop.id);
  let mail = await outboxSince(mailBefore);
  check("webhook marks the shop order paid", response.status === 200 && order?.status === "paid" && order?.paymentIntentId === `pi_test_${shop.id}`);
  const toCustomer = mail.find((m) => m.headers.To === customer.email);
  const toStaff = mail.find((m) => m.headers.To === "info@pulse8.ie");
  check("customer and staff emailed once each", mail.length === 2 && Boolean(toCustomer) && Boolean(toStaff), `${mail.length} messages`);
  check(
    "customer email lists the order",
    Boolean(toCustomer?.headers.Subject?.includes(shop.id) && toCustomer?.text?.includes("(Size: M)") && toCustomer?.text?.includes("2,619.85")),
  );
  check(
    "staff email replies to the customer and flags the delivery placeholder",
    toStaff?.headers["Reply-To"] === customer.email && Boolean(toStaff?.headers.Subject?.startsWith("[TEST]")) && Boolean(toStaff?.text?.includes("Placeholder")),
  );
  check("no booking changed by the shop payment", (await orders()).length === bookingsBefore);

  mailBefore = (await outboxMail()).length;
  await postEvent(shopCheckoutEvent("checkout.session.completed", shop));
  check("a replayed payment sends nothing more", (await outboxMail()).length === mailBefore && (await shopById(shop.id))?.status === "paid");

  const returned = await page(`/cart/return?session_id=${shop.checkoutSessionId}`);
  check("return page confirms the paid order", returned.includes("Thanks, your order is in") && returned.includes(shop.id));
  const unknownReturn = await page("/cart/return?session_id=cs_test_madeup123456");
  check("return page with a made-up id finds nothing", unknownReturn.includes("find that order") && !unknownReturn.includes("your order is in"));

  // Paid, but not the amount we asked for.
  const off = (await placeShopOrder()).order;
  mailBefore = (await outboxMail()).length;
  await postEvent(shopCheckoutEvent("checkout.session.completed", off, { amount_total: 100 }));
  order = await shopById(off.id);
  mail = await outboxSince(mailBefore);
  check("wrong amount held for review, not confirmed", order?.status === "exception");
  check(
    "only staff told, with ACTION NEEDED",
    mail.length === 1 && mail[0].headers.To === "info@pulse8.ie" && mail[0].text.includes("ACTION NEEDED"),
  );

  const lapsed = (await placeShopOrder()).order;
  await postEvent(shopCheckoutEvent("checkout.session.expired", lapsed, { payment_status: "unpaid" }));
  check("expired Checkout closes the order", (await shopById(lapsed.id))?.status === "expired");

  const delayed = (await placeShopOrder()).order;
  await postEvent(shopCheckoutEvent("checkout.session.completed", delayed, { payment_status: "unpaid" }));
  check("delayed payment waits as processing", (await shopById(delayed.id))?.status === "processing");
  await postEvent(shopCheckoutEvent("checkout.session.async_payment_failed", delayed, { payment_status: "unpaid" }));
  check("failed delayed payment closes the order", (await shopById(delayed.id))?.status === "failed");

  const paidShop = await shopById(shop.id);
  await postEvent(refundEvent(paidShop, 995));
  order = await shopById(shop.id);
  check("part refund recorded, order stays paid", order?.status === "paid" && order?.amountRefunded === 995);
  await postEvent(refundEvent(paidShop, BASKET_TOTAL));
  order = await shopById(shop.id);
  check("full refund marks the order refunded", order?.status === "refunded" && order?.amountRefunded === BASKET_TOTAL);
  check("no booking changed by the shop refund", (await orders()).length === bookingsBefore);

  response = await postEvent(shopCheckoutEvent("checkout.session.completed", { ...shop, id: "S8-UNKNOWN0" }));
  check("event for an unknown shop order is ignored", response.status === 200);

  response = await fetch(`${BASE}/api/admin/shop-orders`);
  check("shop order list needs admin auth", response.status === 401);
  response = await json(`/api/admin/shop-orders/${shop.id}/emails`, { kind: "staff" });
  check("shop email retry needs admin auth", response.status === 401);
  await stopApp();

  console.log("\nShop order requests (payments off)");
  await startApp({ BOOKING_PAYMENTS_ENABLED: "0" });
  const callsBefore = mockCalls.length;
  mailBefore = (await outboxMail()).length;
  const requestKey = attempt();
  response = await json("/api/shop/checkout", { attemptKey: requestKey, lines: basket, ...customer });
  let body = await response.json();
  order = await shopById(body.reference);
  mail = await outboxSince(mailBefore);
  check("order request accepted without Stripe", response.status === 200 && body.requested === true && mockCalls.length === callsBefore);
  check("request recorded as requested", order?.status === "requested" && order?.mode === "request" && order?.amountTotal === BASKET_TOTAL);
  check(
    "staff get the request, customer an acknowledgement",
    mail.length === 2 &&
      mail.some((m) => m.headers.Subject.startsWith("Shop order request")) &&
      mail.some((m) => m.headers.Subject.startsWith("Order request received")),
  );
  mailBefore = (await outboxMail()).length;
  response = await json("/api/shop/checkout", { attemptKey: requestKey, lines: basket, ...customer });
  body = await response.json();
  check("double submit reuses the request and sends nothing more", body.reference === order?.id && (await outboxMail()).length === mailBefore);
  await stopApp();

  await startApp({ BOOKING_PAYMENTS_ENABLED: "0", MAIL_TRANSPORT: "fail" });
  const failKey = attempt();
  response = await json("/api/shop/checkout", { attemptKey: failKey, lines: basket, ...customer });
  body = await response.json();
  check("request reports failure when staff can't be emailed", response.status === 502 && typeof body.error === "string");
  await stopApp();

  await startApp({ BOOKING_PAYMENTS_ENABLED: "0" });
  mailBefore = (await outboxMail()).length;
  response = await json("/api/shop/checkout", { attemptKey: failKey, lines: basket, ...customer });
  body = await response.json();
  order = await shopById(body.reference);
  check(
    "resubmitting the failed request delivers it",
    response.status === 200 && order?.emails.staff.status === "sent" && order?.emails.customer.status === "sent",
  );
  check("the retry sent exactly the two missing emails", (await outboxMail()).length === mailBefore + 2);
  response = await json(`/api/admin/shop-orders/${order?.id}/emails`, { kind: "staff" }, adminAuth);
  check("staff retry of a sent email sends nothing", response.status === 200 && (await response.json()).alreadySent === true);
}

/** A request to an admin API, signed in (or not) as given. */
const adminCall = (url, method, body, headers = adminAuth) =>
  fetch(`${BASE}${url}`, {
    method,
    headers: {
      origin: BASE,
      "x-forwarded-for": `10.8.${Math.floor(++clientCounter / 250)}.${clientCounter % 250}`,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

async function adminChecks() {
  await stopApp();
  await startApp();

  console.log("\nAdmin: sign-in and roles");
  let response = await fetch(`${BASE}/admin`, { redirect: "manual" });
  check("signed-out visit to /admin goes to sign in", isRedirect(response.status) && Boolean(response.headers.get("location")?.includes("/admin/login")));
  response = await fetch(`${BASE}/admin/login`);
  check("sign-in page is there", response.status === 200 && (await response.text()).includes("Sign in"));
  response = await fetch(`${BASE}/admin`, { headers: adminAuth });
  check("signed-in owner sees the dashboard", response.status === 200 && (await response.text()).includes("Course dates"));
  response = await fetch(`${BASE}/api/admin/prices`);
  check("prices API refuses a signed-out request", response.status === 401);
  response = await adminCall("/api/admin/prices", "PUT", { courses: { "cardiac-first-response": 1 } }, { ...adminAuth, origin: "https://evil.example" });
  check("a change sent from another site is refused", response.status === 403);

  for (let i = 0; i < 5; i += 1) {
    response = await json("/api/admin/auth/login", { email: OWNER.email, password: "wrong-password-here" });
  }
  check("wrong password refused", response.status === 401);
  response = await json("/api/admin/auth/login", { email: OWNER.email, password: OWNER.password });
  check("sixth try in 15 minutes is rate limited, even with the right password", response.status === 429);

  response = await adminCall("/api/admin/staff", "POST", { name: STAFF.name, email: STAFF.email, role: "staff", password: STAFF.password });
  check("owner adds a staff login", response.status === 200);
  response = await adminCall("/api/admin/staff", "POST", { name: "Dup", email: STAFF.email.toUpperCase(), role: "staff", password: STAFF.password });
  check("a second login with the same email is refused", response.status === 409);
  response = await json("/api/admin/auth/login", { email: STAFF.email, password: STAFF.password });
  const staffAuth = { cookie: sessionCookie(response) };
  check("staff member signs in with their password", response.status === 200 && staffAuth.cookie.length > 20);
  response = await fetch(`${BASE}/api/admin/staff`, { headers: staffAuth });
  check("staff can't manage logins", response.status === 403);

  // Owners can copy a 7-day sign-in link to send someone themselves.
  const everyone = await (await fetch(`${BASE}/api/admin/staff`, { headers: adminAuth })).json();
  const staffRow = everyone.find((user) => user.email === STAFF.email);
  response = await adminCall(`/api/admin/staff/${staffRow.id}/link`, "POST", { copy: true }, staffAuth);
  check("staff can't make sign-in links", response.status === 403);
  response = await adminCall(`/api/admin/staff/${staffRow.id}/link`, "POST", { copy: true });
  const copied = await response.json();
  check("owner copies a sign-in link", response.status === 200 && typeof copied.url === "string" && copied.url.includes("/admin/login/link#"));
  const copiedToken = copied.url?.split("#")[1];
  response = await json("/api/admin/auth/link/verify", { token: copiedToken });
  check("the copied link signs that person in", response.status === 200 && sessionCookie(response).length > 20);
  response = await json("/api/admin/auth/link/verify", { token: copiedToken });
  check("the copied link works once", response.status !== 200);
  response = await fetch(`${BASE}/api/admin/prices`, { headers: staffAuth });
  const prices = await response.json();
  check("staff can open prices", response.status === 200 && prices.classroom.some((c) => c.slug === "cardiac-first-response" && c.price === 95));
  check(
    "imported placeholder prices are all there",
    [["fire-marshal", 95], ["paediatric-first-aid", 110], ["basic-first-aid", 85], ["epipen", null]].every(([slug, price]) =>
      prices.classroom.some((c) => c.slug === slug && c.price === price),
    ),
  );
  check("a Blended Learning course isn't priced here", !prices.classroom.some((c) => c.slug === "first-aid-response-blended"));
  check("online courses aren't priced here", !prices.classroom.some((c) => c.slug === "manual-handling-training"));
  check("imported shop prices match the catalogue", prices.shop.find((p) => p.slug === MINDRAY)?.price === 1295);
  // Finance: owners only. Staff see bookings and orders, never amounts.
  console.log("\nAdmin: Finance (owners only)");
  response = await fetch(`${BASE}/api/admin/finance?range=all`, { headers: staffAuth });
  check("staff can't open Finance", response.status === 403);
  response = await fetch(`${BASE}/api/admin/finance?range=all`);
  check("Finance refuses a signed-out request", response.status === 401);
  response = await fetch(`${BASE}/api/admin/finance?range=all`, { headers: adminAuth });
  const finance = await response.json();
  const allBookings = await (await fetch(`${BASE}/api/admin/bookings`, { headers: adminAuth })).json();
  const allShop = await (await fetch(`${BASE}/api/admin/shop-orders`, { headers: adminAuth })).json();
  const takenStatuses = new Set(["paid", "refunded", "exception"]);
  const expectedNet =
    allBookings.filter((o) => takenStatuses.has(o.status) && !o.livemode).reduce((t, o) => t + o.amountTotal - Math.min(o.amountTotal, o.amountRefunded ?? (o.status === "refunded" ? o.amountTotal : 0)), 0) +
    allShop.filter((o) => o.mode === "payment" && takenStatuses.has(o.status) && !o.livemode).reduce((t, o) => t + o.amountTotal - Math.min(o.amountTotal, o.amountRefunded ?? (o.status === "refunded" ? o.amountTotal : 0)), 0);
  check("owner opens Finance", response.status === 200 && Array.isArray(finance.periods));
  check("Stripe test mode: Finance shows test payments, marked as test", finance.mode === "test" && finance.hasTest === true && finance.hasLive === false);
  check("Finance has payments from the runs above", finance.totals.payments > 0 && finance.totals.net > 0, JSON.stringify(finance.totals));
  check("Finance total matches the bookings and shop orders, after refunds", finance.totals.net === expectedNet, `${finance.totals.net} vs ${expectedNet}`);
  check(
    "Finance sources add up to the total",
    finance.bySource.reduce((t, s) => t + s.net, 0) === finance.totals.net && finance.periods.reduce((t, p) => t + p.total, 0) === finance.totals.net,
  );
  check("Finance counts shop and Blended Learning separately", finance.bySource.find((s) => s.source === "shop")?.net > 0 && finance.bySource.find((s) => s.source === "blended")?.payments > 0);
  response = await fetch(`${BASE}/api/admin/finance?range=all&mode=live`, { headers: adminAuth });
  check("no live payments mixed in while Stripe is in test mode", (await response.json()).totals.net === 0);
  response = await fetch(`${BASE}/api/admin/finance?range=30d`, { headers: adminAuth });
  check("30-day range is per day", (await response.json()).periods.length === 30);
  const staffBookings = await (await fetch(`${BASE}/api/admin/bookings`, { headers: staffAuth })).json();
  check(
    "staff see bookings without any amounts",
    staffBookings.length === allBookings.length && staffBookings.every((o) => !("amountTotal" in o) && !("unitAmount" in o) && !("amountRefunded" in o) && o.courseTitle),
  );
  const staffShop = await (await fetch(`${BASE}/api/admin/shop-orders`, { headers: staffAuth })).json();
  check(
    "staff see shop orders without any amounts",
    staffShop.length === allShop.length &&
      staffShop.every((o) => !("amountTotal" in o) && !("subtotal" in o) && !("delivery" in o) && o.lines.every((l) => !("unitAmount" in l) && !("lineTotal" in l) && l.name)),
  );
  check("owners still see amounts on bookings", allBookings.some((o) => typeof o.amountTotal === "number"));
  response = await fetch(`${BASE}/admin`, { headers: staffAuth });
  const staffPage = await response.text();
  check("staff dashboard has no Finance in the menu", response.status === 200 && !staffPage.includes('"finance"') && !staffPage.includes(">Finance<"));

  response = await adminCall("/api/admin/auth/logout", "POST", {}, staffAuth);
  response = await fetch(`${BASE}/api/admin/prices`, { headers: staffAuth });
  check("signing out ends the session", response.status === 401);

  const owners = await (await fetch(`${BASE}/api/admin/staff`, { headers: adminAuth })).json();
  const me = owners.find((user) => user.email === OWNER.email);
  response = await adminCall(`/api/admin/staff/${me.id}`, "PATCH", { role: "staff" });
  check("the only owner can't be demoted", response.status === 409);

  console.log("\nAdmin: prices reach checkout");
  response = await adminCall("/api/admin/prices", "PUT", { courses: { "cardiac-first-response": "120" } });
  check("owner changes a course price", response.status === 200);
  let started = await startCheckout(SESSIONS.cfr.id);
  check("checkout charges the new price (120.00)", started.call?.params.get("line_items[0][price_data][unit_amount]") === "12000");
  response = await adminCall("/api/admin/prices", "PUT", { courses: { "cardiac-first-response": "" } });
  started = await startCheckout(SESSIONS.cfr.id);
  check("a blank price means Enquire: no checkout", started.response.status >= 400);
  check("…and /book offers Enquire for it", sessionField(await page("/book"), SESSIONS.cfr.id, "action") === "enquire");
  response = await adminCall("/api/admin/prices", "PUT", { courses: { "cardiac-first-response": "abc" } });
  check("a price that isn't a number is refused", response.status === 400);
  await adminCall("/api/admin/prices", "PUT", { courses: { "cardiac-first-response": 95 } });

  response = await adminCall("/api/admin/prices", "PUT", { shop: { [MINDRAY]: 1200 }, delivery: { flatEuro: 7.5, freeOverEuro: 5000 } });
  check("owner changes a shop price and the delivery rates", response.status === 200);
  const placed = await placeShopOrder();
  const p = placed.call?.params;
  check("shop checkout charges the new product price (1,200.00)", p?.get("line_items[0][price_data][unit_amount]") === "120000");
  check("shop checkout adds the new delivery charge (7.50)", lineTotal(p) === 2 * 120000 + 3 * 995 + 750);
  await adminCall("/api/admin/prices", "PUT", { shop: { [MINDRAY]: 1295 }, delivery: { flatEuro: 0, freeOverEuro: null } });

  console.log("\nAdmin: course dates");
  const day = isoInDays(21);
  response = await adminCall("/api/admin/dates", "POST", { courseSlug: "fire-marshal", date: day, start: "10:00", end: "13:30", days: 1, seatsLeft: 4, venue: "Cork Training Rooms", priceOverride: "80" });
  const added = (await response.json()).date;
  check("owner adds a date", response.status === 200 && typeof added?.id === "string");
  let book = await page("/book");
  check("the new date is on /book straight away", sessionField(book, added.id, "action") === "book");
  check("…with its own venue and end time", book.includes("Cork Training Rooms") && sessionField(book, added.id, "end") === "13");
  check("…and no price in the page", !/"priceOverride"/.test(book) && !/\\?"price\\?":/.test(book));
  started = await startCheckout(added.id);
  check("the date's own price is charged (80.00)", started.call?.params.get("line_items[0][price_data][unit_amount]") === "8000");
  response = await adminCall(`/api/admin/dates/${added.id}`, "PATCH", { seatsLeft: 6, priceOverride: "" });
  check("owner edits the date", response.status === 200);
  started = await startCheckout(added.id);
  check("a cleared date price falls back to the course price (95.00)", started.call?.params.get("line_items[0][price_data][unit_amount]") === "9500");
  response = await adminCall(`/api/admin/dates/${added.id}`, "PATCH", { closed: true });
  book = await page("/book");
  check("a closed date leaves /book", response.status === 200 && !book.includes(added.id));
  started = await startCheckout(added.id);
  check("a closed date can't be booked", started.response.status >= 400);
  response = await adminCall(`/api/admin/dates/${added.id}`, "DELETE");
  check("a date with bookings can't be deleted", response.status === 409);
  response = await adminCall("/api/admin/dates", "POST", { courseSlug: "fire-marshal", date: "2027-02-30", start: "10:00", days: 1, seatsLeft: 4 });
  check("an impossible date is refused", response.status === 400);
  response = await adminCall("/api/admin/dates", "POST", { courseSlug: "cpr-for-family-friends-online-x", date: day, start: "10:00", days: 1, seatsLeft: 4 });
  check("a date for an unknown course is refused", response.status === 400);
  response = await adminCall("/api/admin/dates", "POST", { courseSlug: "basic-first-aid", date: day, start: "10:00", days: 1, seatsLeft: 4 });
  const spare = (await response.json()).date;
  response = await adminCall(`/api/admin/dates/${spare.id}`, "DELETE");
  check("an unbooked date can be deleted", response.status === 200 && !(await page("/book")).includes(spare.id));

  console.log("\nAdmin: activity log");
  const log = await (await fetch(`${BASE}/api/admin/activity`, { headers: adminAuth })).json();
  check("the import is logged", log.some((entry) => entry.action === "import"));
  check("price change logged with who made it", log.some((entry) => entry.actorName === OWNER.name && entry.summary === "Course price, Cardiac First Response: €95 → €120"));
  check("date added, closed and deleted are logged", ["Added date: Fire Marshal", "Closed date: Fire Marshal", "Deleted date: Basic First Aid"].every((text) => log.some((entry) => entry.summary.startsWith(text))));
  check("the log holds no customer details", !JSON.stringify(log).includes(buyer.email) && !JSON.stringify(log).includes(customer.email));
}

/**
 * Where the Postgres store put its tables, and who can read them. Customers'
 * names and addresses must never be reachable through Supabase's REST API:
 * the tables live in `website` (not `public`), have RLS on with no policies,
 * and Supabase's API roles hold no rights on them or the schema.
 */
async function privacyChecks(url) {
  console.log("\nPostgres: tables private");
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const TABLES = [
      "booking_orders", "shop_orders", "booking_events",
      "admin_docs", "staff_users", "staff_sessions", "staff_login_tokens", "staff_login_attempts", "admin_audit",
    ];
    const { rows } = await client.query(
      `SELECT n.nspname AS schema, c.relname AS name, c.relrowsecurity AS rls
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r' AND c.relname = ANY($1)`,
      [TABLES],
    );
    check(`all ${TABLES.length} tables are in schema website`, TABLES.every((name) => rows.some((r) => r.name === name && r.schema === "website")));
    check("none of them in public or anywhere else", rows.every((r) => r.schema === "website"));
    check("row level security on for each", rows.length === TABLES.length && rows.every((r) => r.rls === true));
    const policies = await client.query("SELECT count(*)::int AS n FROM pg_policies WHERE schemaname = 'website'");
    check("no RLS policies (nothing is allowed through)", policies.rows[0].n === 0);

    const roles = (await client.query("SELECT rolname FROM pg_roles WHERE rolname = ANY($1)", [["anon", "authenticated", "service_role"]])).rows.map((r) => r.rolname);
    if (!roles.includes("anon")) {
      console.log("  (no Supabase roles in this database: anon checks skipped. Run against the supabase/postgres image to include them.)");
      return;
    }
    for (const role of roles) {
      const priv = await client.query(
        `SELECT has_schema_privilege($1, 'website', 'USAGE') AS usage,
                bool_or(has_table_privilege($1, 'website.' || t, 'SELECT,INSERT,UPDATE,DELETE')) AS any_table
           FROM unnest($2::text[]) AS t`,
        [role, TABLES],
      );
      check(`${role} cannot use schema website`, priv.rows[0].usage === false);
      check(`${role} has no rights on the tables`, priv.rows[0].any_table === false);
    }
    // And for real: as anon, a read fails (needs the connecting role to be able to SET ROLE anon).
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE anon");
      let denied = false;
      try {
        await client.query("SELECT count(*) FROM website.booking_orders");
      } catch (error) {
        denied = /permission denied/i.test(error.message);
      }
      check("a read as anon is refused", denied);
    } catch {
      console.log("  (this login cannot SET ROLE anon: live read check skipped, privilege checks above cover it)");
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
    }
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------- run, once per store
const stores = [{ label: "file store", env: {} }];
if (process.env.BOOKING_CHECK_DATABASE_URL) {
  const url = process.env.BOOKING_CHECK_DATABASE_URL;
  // Its tables are dropped: never point this at a database that matters, and
  // never at a hosted Supabase project (production lives in BL's project).
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error('BOOKING_CHECK_DATABASE_URL must name a throwaway database whose name contains "test"');
  }
  if (/supabase\.(co|com)$/i.test(new URL(url).hostname)) {
    throw new Error("BOOKING_CHECK_DATABASE_URL points at a hosted Supabase project. Use a local throwaway database.");
  }
  stores.push({
    label: "Postgres store",
    env: { BOOKING_DATABASE_URL: url },
    async reset() {
      const { default: pg } = await import("pg");
      const client = new pg.Client({ connectionString: url });
      await client.connect();
      // Only the tables: the schema and the website_app role stay, as in production.
      await client.query(
        "DROP TABLE IF EXISTS website.booking_orders, website.shop_orders, website.booking_events, " +
          "website.admin_docs, website.staff_sessions, website.staff_login_tokens, website.staff_login_attempts, " +
          "website.admin_audit, website.staff_users",
      );
      await client.end();
    },
    verify: () => privacyChecks(url),
  });
} else {
  console.log("Postgres store: skipped. Set BOOKING_CHECK_DATABASE_URL to a throwaway local database to run it too.");
}

await new Promise((resolve) => mock.listen(MOCK_PORT, resolve));
await new Promise((resolve) => blMock.listen(BL_PORT, resolve));
try {
  for (const store of stores) {
    storeLabel = store.label;
    console.log(`\n=== ${store.label}`);
    await rm(dataDir, { recursive: true, force: true });
    await store.reset?.();
    blReset();
    storeEnv = store.env;
    try {
      await suite();
      await store.verify?.();
    } catch (error) {
      failures.push(`[${store.label}] crashed: ${error.message}`);
      console.error(error);
    } finally {
      await stopApp();
    }
  }
} finally {
  mock.close();
  blMock.close();
  await rm(work, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
