import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { mapFeed, parsePrice, imageUrl, dublinParts, FeedError } from "../../lib/blended/map.ts";
import { sign, signedHeaders, verify, FEED_PAYLOAD, SIGNATURE_TOLERANCE_SECONDS } from "../../lib/blended/signing.ts";

// Fake data only: made-up ids, example.com hosts, a throwaway secret.

const SECRET = "unit-test-secret-not-real";
const PAYLOAD = '{"example":true}';
const TS = 1_767_000_000;

function hexHmac(secret, timestamp, payload) {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
}

/** Spread, not destructuring defaults: an explicit undefined must reach verify. */
function verifyAt(overrides = {}) {
  return verify({
    secret: SECRET,
    payload: PAYLOAD,
    timestamp: String(TS),
    signature: sign(SECRET, TS, PAYLOAD),
    nowMs: TS * 1000,
    ...overrides,
  });
}

// ---------------------------------------------------------------- signing.ts

test("signing: sign is sha256= plus hex HMAC-SHA256 of `<ts>.<payload>`", () => {
  assert.equal(sign(SECRET, TS, PAYLOAD), `sha256=${hexHmac(SECRET, TS, PAYLOAD)}`);
  assert.match(sign(SECRET, TS, PAYLOAD), /^sha256=[0-9a-f]{64}$/);
  assert.notEqual(sign(SECRET, TS + 1, PAYLOAD), sign(SECRET, TS, PAYLOAD), "timestamp is signed");
  assert.notEqual(sign(SECRET, TS, `${PAYLOAD} `), sign(SECRET, TS, PAYLOAD), "payload is signed");
});

test("signing: signedHeaders sends floor(nowMs / 1000) and its signature", () => {
  const nowMs = TS * 1000 + 789;
  assert.deepEqual(signedHeaders(SECRET, PAYLOAD, nowMs), {
    "x-pulse8-timestamp": String(TS),
    "x-pulse8-signature": sign(SECRET, TS, PAYLOAD),
  });
  assert.deepEqual(signedHeaders(SECRET, PAYLOAD, 1_000), {
    "x-pulse8-timestamp": "1",
    "x-pulse8-signature": sign(SECRET, 1, PAYLOAD),
  });
});

test("signing: verify accepts a fresh signature", () => {
  assert.equal(verifyAt(), true);
  assert.equal(verifyAt({ nowMs: TS * 1000 + 999 }), true);
});

test("signing: verify accepts exactly 300 s old and exactly 300 s ahead", () => {
  assert.equal(verifyAt({ timestamp: String(TS - 300), signature: sign(SECRET, TS - 300, PAYLOAD) }), true);
  assert.equal(verifyAt({ timestamp: String(TS + 300), signature: sign(SECRET, TS + 300, PAYLOAD) }), true);
});

test("signing: verify rejects 301 s old and 301 s ahead", () => {
  assert.equal(verifyAt({ timestamp: String(TS - 301), signature: sign(SECRET, TS - 301, PAYLOAD) }), false);
  assert.equal(verifyAt({ timestamp: String(TS + 301), signature: sign(SECRET, TS + 301, PAYLOAD) }), false);
});

test("signing: verify rejects a changed payload", () => {
  assert.equal(
    verify({
      secret: SECRET,
      payload: PAYLOAD + "x",
      timestamp: String(TS),
      signature: sign(SECRET, TS, PAYLOAD),
      nowMs: TS * 1000,
    }),
    false,
  );
});

test("signing: verify rejects the wrong secret", () => {
  assert.equal(
    verify({
      secret: "another-fake-secret",
      payload: PAYLOAD,
      timestamp: String(TS),
      signature: sign(SECRET, TS, PAYLOAD),
      nowMs: TS * 1000,
    }),
    false,
  );
});

test("signing: verify rejects an empty secret", () => {
  assert.equal(
    verify({
      secret: "",
      payload: PAYLOAD,
      timestamp: String(TS),
      signature: sign("", TS, PAYLOAD),
      nowMs: TS * 1000,
    }),
    false,
  );
});

test("signing: verify rejects a missing timestamp or signature", () => {
  assert.equal(verifyAt({ timestamp: null }), false);
  assert.equal(verifyAt({ timestamp: undefined }), false);
  assert.equal(verifyAt({ signature: null }), false);
  assert.equal(verifyAt({ signature: undefined }), false);
});

test("signing: verify rejects a signature without the sha256= prefix", () => {
  const hex = hexHmac(SECRET, TS, PAYLOAD);
  assert.equal(verifyAt({ signature: hex }), false);
  assert.equal(verifyAt({ signature: `sha1=${hex}` }), false);
  assert.equal(verifyAt({ signature: `SHA256=${hex}` }), false);
});

test("signing: verify rejects non-hex or wrongly sized hex", () => {
  const hex = hexHmac(SECRET, TS, PAYLOAD);
  assert.equal(verifyAt({ signature: `sha256=${"z".repeat(64)}` }), false);
  assert.equal(verifyAt({ signature: `sha256=${hex.slice(0, 63)}` }), false);
  assert.equal(verifyAt({ signature: `sha256=${hex}a` }), false);
  assert.equal(verifyAt({ signature: "sha256=" }), false);
});

test("signing: verify rejects a non-numeric timestamp", () => {
  for (const timestamp of ["12a", "1e9", "-5"]) {
    assert.equal(verifyAt({ timestamp }), false, `timestamp ${timestamp}`);
  }
});

test("signing: verify defaults its clock to now", () => {
  const headers = signedHeaders(SECRET, PAYLOAD);
  assert.equal(
    verify({
      secret: SECRET,
      payload: PAYLOAD,
      timestamp: headers["x-pulse8-timestamp"],
      signature: headers["x-pulse8-signature"],
    }),
    true,
  );
});

test("signing: FEED_PAYLOAD and SIGNATURE_TOLERANCE_SECONDS are the agreed values", () => {
  assert.equal(FEED_PAYLOAD, "GET /api/integrations/courses");
  assert.equal(SIGNATURE_TOLERANCE_SECONDS, 300);
});

// -------------------------------------------------------------- parsePrice

test("parsePrice: euro cents for a euro price, whatever the case", () => {
  assert.equal(parsePrice({ amount_cents: 27500, currency: "eur" }), 27500);
  assert.equal(parsePrice({ amount_cents: 27500, currency: "EUR" }), 27500);
});

test("parsePrice: null for anything that is not a positive euro amount", () => {
  const cases = [
    ["null", null],
    ["undefined", undefined],
    ["zero", { amount_cents: 0, currency: "eur" }],
    ["negative", { amount_cents: -27500, currency: "eur" }],
    ["fractional cents", { amount_cents: 12.5, currency: "eur" }],
    ["cents as a string", { amount_cents: "27500", currency: "eur" }],
    ["dollars", { amount_cents: 27500, currency: "usd" }],
    ["no currency", { amount_cents: 27500 }],
  ];
  for (const [label, value] of cases) {
    assert.equal(parsePrice(value), null, label);
  }
});

// ---------------------------------------------------------------- imageUrl

const SUPABASE_IMAGE = "https://abcdefghij.supabase.co/storage/v1/object/public/courses/first-aid.jpg";

test("imageUrl: keeps a public Supabase storage URL", () => {
  assert.equal(imageUrl(SUPABASE_IMAGE), SUPABASE_IMAGE);
});

test("imageUrl: drops every other host, path, protocol and nonsense", () => {
  const cases = [
    ["http", "http://abcdefghij.supabase.co/storage/v1/object/public/courses/x.jpg"],
    ["another host", "https://evil.example/storage/v1/object/public/x.jpg"],
    ["signed path", "https://abcdefghij.supabase.co/storage/v1/object/sign/courses/x.jpg"],
    ["lookalike host", "https://supabase.co.evil.example/storage/v1/object/public/x.jpg"],
    ["garbage", "not a url"],
    ["null", null],
  ];
  for (const [label, value] of cases) {
    assert.equal(imageUrl(value), undefined, label);
  }
});

// -------------------------------------------------------------- dublinParts

test("dublinParts: Dublin wall clock, GMT in winter and IST in summer", () => {
  assert.deepEqual(dublinParts(new Date("2026-12-16T09:00:00Z")), { date: "2026-12-16", time: "09:00" });
  assert.deepEqual(dublinParts(new Date("2027-06-16T08:00:00Z")), { date: "2027-06-16", time: "09:00" });
  assert.deepEqual(dublinParts(new Date("2027-06-15T23:30:00Z")), { date: "2027-06-16", time: "00:30" });
});

// ------------------------------------------------------------------ mapFeed

const DAY = {
  session_id: "day-1",
  starts_at: "2026-12-16T09:00:00Z",
  ends_at: "2026-12-16T17:00:00Z",
  venue_name: "Pulse 8 Training Centre",
  venue_address: "Unit 4, Dublin 8",
  capacity: 12,
  places_left: 7,
};

function makeDay(overrides = {}) {
  return { ...DAY, ...overrides };
}

function makeCourse(overrides = {}) {
  return {
    id: "bl-course-1",
    slug: "first-aid-response",
    title: "First Aid Response",
    summary: "Online theory plus one practical day.",
    description: "Book the theory online, then attend one practical day.",
    image_url: SUPABASE_IMAGE,
    delivery: "blended",
    length_label: "6 hours",
    certificate: { name: "PHECC First Aid Response", valid_for_months: 24 },
    practical_days: [makeDay()],
    price: { amount_cents: 27500, currency: "eur" },
    ...overrides,
  };
}

function options(overrides = {}) {
  return { linked: new Map(), takenSlugs: new Set(), ...overrides };
}

/** One course in, the single mapped course out. */
function mapOnly(courseOverrides = {}, optionOverrides = {}) {
  const mapped = mapFeed({ courses: [makeCourse(courseOverrides)] }, options(optionOverrides));
  assert.equal(mapped.length, 1, "one course expected");
  return mapped[0];
}

test("mapFeed 1: a body that is not a course list throws FeedError", () => {
  for (const body of [null, undefined, {}, { courses: "x" }, { courses: null }]) {
    assert.throws(() => mapFeed(body, options()), FeedError, `body ${JSON.stringify(body)}`);
  }
  assert.throws(
    () => mapFeed({ courses: {} }, options()),
    (error) => error instanceof FeedError && error instanceof Error,
  );
});

test("mapFeed 1: null entries and entries missing id, slug or title are skipped", () => {
  const mapped = mapFeed(
    {
      courses: [
        null,
        "not a course",
        42,
        makeCourse({ id: undefined }),
        makeCourse({ slug: undefined }),
        makeCourse({ title: undefined }),
        makeCourse({ title: "   " }),
        makeCourse(),
      ],
    },
    options(),
  );
  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].id, "bl-course-1");
});

test("mapFeed 2: a BL course becomes a published first-aid website course", () => {
  const mapped = mapOnly();
  assert.equal(mapped.linked, false);
  assert.equal(mapped.id, "bl-course-1");
  assert.equal(mapped.slug, "first-aid-response");
  assert.equal(mapped.blSlug, "first-aid-response");
  assert.equal(mapped.priceCents, 27500);

  const course = mapped.course;
  assert.equal(course.slug, "first-aid-response");
  assert.equal(course.title, "First Aid Response");
  assert.equal(course.blurb, "Online theory plus one practical day.");
  assert.equal(course.delivery, "Blended");
  assert.equal(course.category, "first-aid");
  assert.equal(course.status, "published");
  assert.equal(course.blendedCourseId, "bl-course-1");
  assert.equal(course.duration, "6 hours");
  assert.equal(course.certificate, "PHECC First Aid Response");
  assert.equal(course.validity, "2 years");
});

test("mapFeed 3: the public course never carries a price", () => {
  const mapped = mapOnly();
  assert.equal(mapped.priceCents, 27500, "the price stays on the wrapper");
  assert.equal("price" in mapped.course, false);
  assert.equal(mapped.course.price, undefined);
  const json = JSON.stringify(mapped.course);
  assert.equal(json.includes("27500"), false, json);
  assert.equal(json.includes("price"), false, json);
});

test("mapFeed 4: priceCents is null when the price is missing, null or not euro", () => {
  const cases = [
    ["missing", { price: undefined }],
    ["null", { price: null }],
    ["usd", { price: { amount_cents: 27500, currency: "usd" } }],
  ];
  for (const [label, overrides] of cases) {
    const mapped = mapOnly(overrides);
    assert.equal(mapped.priceCents, null, label);
    assert.equal(mapped.course.slug, "first-aid-response", label);
    assert.equal(mapped.sessions.length, 1, label);
  }
});

test("mapFeed 5: BL description paragraphs become the course body", () => {
  const mapped = mapOnly({ description: "Para one.\nstill one.\n\nPara two." });
  assert.deepEqual(mapped.course.description, ["Para one. still one.", "Para two."]);
});

test("mapFeed 5: no description means no description key", () => {
  for (const description of [undefined, null]) {
    const mapped = mapOnly({ description });
    assert.equal("description" in mapped.course, false, String(description));
  }
});

test("mapFeed 5: the blurb falls back from summary to first paragraph to title", () => {
  assert.equal(mapOnly().course.blurb, "Online theory plus one practical day.");
  assert.equal(
    mapOnly({ summary: undefined, description: "First para.\n\nSecond para." }).course.blurb,
    "First para.",
  );
  assert.equal(mapOnly({ summary: undefined, description: undefined }).course.blurb, "First Aid Response");
});

test("mapFeed 6: certificate validity is written in words", () => {
  const year = mapOnly({ certificate: { name: "PHECC First Aid Response", valid_for_months: 12 } });
  assert.equal(year.course.validity, "1 year");
  const months = mapOnly({ certificate: { name: "PHECC First Aid Response", valid_for_months: 18 } });
  assert.equal(months.course.validity, "18 months");
  const missing = mapOnly({ certificate: { name: "PHECC First Aid Response" } });
  assert.equal("validity" in missing.course, false);
  assert.equal(missing.course.certificate, "PHECC First Aid Response");
});

test("mapFeed 7: the picture is kept only when it is a public Supabase URL", () => {
  assert.equal(mapOnly().course.image, SUPABASE_IMAGE);
  const bad = [
    "http://abcdefghij.supabase.co/storage/v1/object/public/courses/x.jpg",
    "https://evil.example/storage/v1/object/public/x.jpg",
    "https://abcdefghij.supabase.co/storage/v1/object/sign/courses/x.jpg",
    "https://supabase.co.evil.example/storage/v1/object/public/x.jpg",
    "not a url",
    null,
  ];
  for (const image_url of bad) {
    const mapped = mapOnly({ image_url });
    assert.equal("image" in mapped.course, false, `image_url ${String(image_url)}`);
  }
});

test("mapFeed 8: an online BL course is delivered Online", () => {
  assert.equal(mapOnly({ delivery: "online" }).course.delivery, "Online");
  assert.equal(mapOnly({ delivery: "blended" }).course.delivery, "Blended");
});

test("mapFeed 9: a linked website course keeps its own slug and title", () => {
  const mapped = mapOnly(
    {
      practical_days: [
        makeDay(),
        makeDay({ session_id: "day-2", starts_at: "2026-12-17T09:00:00Z", ends_at: "2026-12-17T17:00:00Z" }),
      ],
    },
    {
      linked: new Map([
        ["bl-course-1", { slug: "first-aid-response-blended", title: "First Aid Response (Blended)" }],
      ]),
    },
  );
  assert.equal(mapped.linked, true);
  assert.equal(mapped.slug, "first-aid-response-blended");
  assert.equal(mapped.course.slug, "first-aid-response-blended");
  assert.equal(mapped.course.title, "First Aid Response (Blended)");
  assert.equal(mapped.blSlug, "first-aid-response");
  assert.equal(mapped.sessions.length, 2);
  for (const session of mapped.sessions) {
    assert.equal(session.title, "First Aid Response (Blended)");
    assert.equal(session.courseSlug, "first-aid-response-blended");
  }
});

test("mapFeed 10: a taken BL slug gets -blended", () => {
  const mapped = mapOnly({}, { takenSlugs: new Set(["first-aid-response"]) });
  assert.equal(mapped.slug, "first-aid-response-blended");
  assert.equal(mapped.course.slug, "first-aid-response-blended");
});

test("mapFeed 10: when -blended is taken too the slug starts with blended-", () => {
  const mapped = mapOnly({}, { takenSlugs: new Set(["first-aid-response", "first-aid-response-blended"]) });
  assert.ok(mapped.slug.startsWith("blended-"), mapped.slug);
  assert.equal(mapped.course.slug, mapped.slug);
});

test("mapFeed 10: when every candidate is taken the slug is still unique and set", () => {
  const taken = ["first-aid-response", "first-aid-response-blended", "blended-blcourse1", "blended-blcourse1-2"];
  const mapped = mapOnly({}, { takenSlugs: new Set(taken) });
  assert.equal(mapped.slug, "blended-blcourse1-3");
  assert.equal(mapped.course.slug, mapped.slug);
});

test("mapFeed 10: two BL courses with one slug get different website slugs", () => {
  const mapped = mapFeed(
    { courses: [makeCourse({ id: "bl-a" }), makeCourse({ id: "bl-b" })] },
    options(),
  );
  assert.equal(mapped.length, 2);
  assert.notEqual(mapped[0].slug, mapped[1].slug);
  assert.equal(mapped[0].slug, "first-aid-response");
  assert.equal(mapped[1].slug, "first-aid-response-blended");
});

test("mapFeed 10: an unusable BL slug becomes course-<id>", () => {
  const mapped = mapOnly({ slug: "Bad Slug!" });
  assert.ok(mapped.slug.startsWith("course-"), mapped.slug);
  assert.equal(mapped.blSlug, "Bad Slug!");
});

test("mapFeed 10: a duplicate course id is skipped, first one wins", () => {
  const mapped = mapFeed(
    { courses: [makeCourse({ title: "First" }), makeCourse({ title: "Second" })] },
    options(),
  );
  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].course.title, "First");
});

test("mapFeed 11: a BL practical day becomes a blended website session", () => {
  const mapped = mapOnly();
  assert.equal(mapped.sessions.length, 1);
  const [session] = mapped.sessions;
  assert.equal(session.id, "bl_day-1");
  assert.equal(session.blSessionId, "day-1");
  assert.equal(session.courseSlug, mapped.slug);
  assert.equal(session.title, "First Aid Response");
  assert.equal(session.delivery, "Blended");
  assert.equal(session.sample, false);
  assert.equal(session.family, "response");
  assert.equal(session.capacity, 12);
  assert.equal(session.seatsLeft, 7);
  assert.equal(session.venue, "Pulse 8 Training Centre, Unit 4, Dublin 8");
  assert.equal(session.days, 1);
  assert.equal(session.date, "2026-12-16");
  assert.equal(session.start, "09:00");
  assert.equal(session.end, "17:00");
});

test("mapFeed 11: a summer day is shown on Irish time", () => {
  const mapped = mapOnly({
    practical_days: [makeDay({ starts_at: "2027-06-16T08:00:00Z", ends_at: "2027-06-16T16:00:00Z" })],
  });
  const [session] = mapped.sessions;
  assert.equal(session.date, "2027-06-16");
  assert.equal(session.start, "09:00");
  assert.equal(session.end, "17:00");
  assert.equal(session.days, 1);
});

test("mapFeed 11: a day that ends the next day counts as two days", () => {
  const mapped = mapOnly({ practical_days: [makeDay({ ends_at: "2026-12-17T17:00:00Z" })] });
  assert.equal(mapped.sessions.length, 1);
  assert.equal(mapped.sessions[0].days, 2);
});

test("mapFeed 11: no venue address leaves just the venue name", () => {
  for (const venue_address of [undefined, null]) {
    const mapped = mapOnly({ practical_days: [makeDay({ venue_address })] });
    assert.equal(mapped.sessions[0].venue, "Pulse 8 Training Centre", String(venue_address));
  }
});

test("mapFeed 12: seats left is clamped between zero and capacity", () => {
  const oversold = mapOnly({ practical_days: [makeDay({ places_left: -2 })] });
  assert.equal(oversold.sessions[0].seatsLeft, 0);
  const overfull = mapOnly({ practical_days: [makeDay({ places_left: 20, capacity: 12 })] });
  assert.equal(overfull.sessions[0].seatsLeft, 12);
});

test("mapFeed 13: a bad practical day is skipped and its course kept", () => {
  const cases = [
    ["no venue name", { venue_name: undefined }],
    ["empty venue name", { venue_name: "" }],
    ["ends when it starts", { ends_at: DAY.starts_at }],
    ["ends before it starts", { ends_at: "2026-12-16T08:00:00Z" }],
    ["unparseable start", { starts_at: "not-a-date" }],
    ["unparseable end", { ends_at: "not-a-date" }],
    ["slash in the session id", { session_id: "a/b" }],
    ["fractional capacity", { capacity: 12.5 }],
    ["seats left as a string", { places_left: "7" }],
  ];
  for (const [label, overrides] of cases) {
    const mapped = mapOnly({ practical_days: [makeDay(overrides)] });
    assert.equal(mapped.sessions.length, 0, label);
    assert.equal(mapped.course.slug, "first-aid-response", label);
  }
});

test("mapFeed: a course with no practical days keeps its course and has no sessions", () => {
  for (const practical_days of [undefined, null, [], "day-1"]) {
    const mapped = mapOnly({ practical_days });
    assert.equal(mapped.sessions.length, 0, String(practical_days));
    assert.equal(mapped.course.slug, "first-aid-response", String(practical_days));
  }
});

test("mapFeed: a practical day that is not an object is skipped", () => {
  for (const bad of [null, "day-1", 42, []]) {
    const mapped = mapOnly({ practical_days: [bad] });
    assert.equal(mapped.sessions.length, 0, JSON.stringify(bad));
    assert.equal(mapped.course.slug, "first-aid-response", JSON.stringify(bad));
  }
});

test("mapFeed: a certificate that is not an object is ignored", () => {
  const mapped = mapOnly({ certificate: "PHECC First Aid Response" });
  assert.equal("certificate" in mapped.course, false);
  assert.equal("validity" in mapped.course, false);
});

test("mapFeed: a BL course with no length label or certificate gets neither key", () => {
  const mapped = mapOnly({ length_label: undefined, certificate: undefined });
  assert.equal("duration" in mapped.course, false);
  assert.equal("certificate" in mapped.course, false);
  assert.equal("validity" in mapped.course, false);
  assert.equal(mapped.sessions.length, 1);
  assert.equal(mapped.sessions[0].certificate, undefined);
  assert.equal(mapped.sessions[0].duration, undefined);
});
