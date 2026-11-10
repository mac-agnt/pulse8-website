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
 */
import { spawn } from "node:child_process";
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

let passed = 0;
const failures = [];
function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------- Stripe mock
const mockCalls = [];
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
          amount_total:
            Number(params.get("line_items[0][price_data][unit_amount]")) *
            Number(params.get("line_items[0][quantity]")),
          currency: params.get("line_items[0][price_data][currency]"),
          metadata: { booking_id: params.get("metadata[booking_id]") },
        }),
      );
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "not mocked" } }));
  });
});

// ---------------------------------------------------------------- app server
const work = await mkdtemp(path.join(tmpdir(), "pulse8-check-"));
const contentFile = path.join(work, "site-content.json");
const dataDir = path.join(work, "data");
const outbox = path.join(dataDir, "outbox");

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
  server = spawn(path.join("node_modules", ".bin", "next"), ["start", "-p", String(PORT)], {
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
  const response = await fetch(`${BASE}/api/admin/bookings`, {
    headers: { authorization: `Basic ${Buffer.from(`x:${ADMIN_PASSWORD}`).toString("base64")}` },
  });
  return response.json();
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
await new Promise((resolve) => mock.listen(MOCK_PORT, resolve));
try {
  await startApp();

  console.log("\nPublic pages and data");
  const pages = ["/", "/courses", "/courses/cardiac-first-response", "/courses/epipen", "/book", "/contact"];
  for (const page of pages) {
    const html = await (await fetch(`${BASE}${page}`)).text();
    check(`${page} shows no euro course price`, !/€\s?\d|&euro;|\\u20ac\d|per person/i.test(html));
    check(`${page} carries no "price" field`, !/\\?"price\\?":/.test(html));
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
  const auth = { authorization: `Basic ${Buffer.from(`x:${ADMIN_PASSWORD}`).toString("base64")}` };
  response = await json(`/api/admin/bookings/${failOrder.id}/emails`, { kind: "staff" }, auth);
  order = (await orders()).find((o) => o.id === failOrder.id);
  check("staff email retried on its own", response.status === 200 && order.emails.staff.status === "sent" && order.emails.customer.status === "failed");
  response = await json(`/api/admin/bookings/${failOrder.id}/emails`, { kind: "customer" }, auth);
  order = (await orders()).find((o) => o.id === failOrder.id);
  check("customer email retried on its own", response.status === 200 && order.emails.customer.status === "sent");
  check("exactly two messages sent by the retries", (await outboxMail()).length === before + 2);
  response = await json(`/api/admin/bookings/${failOrder.id}/emails`, { kind: "staff" });
  check("retry endpoint needs admin auth", response.status === 401);
} catch (error) {
  failures.push(`crashed: ${error.message}`);
  console.error(error);
} finally {
  await stopApp();
  mock.close();
  await rm(work, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
