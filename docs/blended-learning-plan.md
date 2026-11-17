# Plan: Pulse 8 website ↔ Blended Learning, end to end

Owner: Matthew. Written 17 Nov 2026. Two lanes build it in parallel:

- **BL lane**: this repo (`matthewamiadamen/blendedlearning`).
- **Website lane**: Mac's new site (`mac-agnt/pulse8-website`), the Next 16 rebuild of pulse8.ie. It isn't live yet:
  pulse8.ie still points at the old WordPress site.

Matthew's go-ahead: build both, push to `main` of both repos once each lane's checks pass, and leave
a positive hand-off note in Mac's repo for Mac and his agent.

## The journey this must make work

1. An admin creates a blended course in BL, sets its **price**, publishes it and makes it Public.
2. The admin adds **cohorts**, meaning practical days: date, time, venue and max places. The first
   cohort's max places is pre-filled with 8, and later ones with the course's last value.
3. The course and its days show on the website by themselves: course card, course page, `/book`
   calendar and the Courses → "Blended learning" menu item. Places left are live.
4. A customer picks a day, chooses 1–6 places, enters each attendee's name and email, and pays
   through the website's existing Stripe Checkout. It's the same flow as every other course.
5. Stripe confirms the payment, and the website tells BL with a signed `booking.confirmed`. Then, for
   each attendee, BL creates the account, enrols them, books the day and sends one email with the
   course link, sign-in link and practical day details. The buyer gets the website's normal receipt.
6. Attendees do the online part any time before the day. If they haven't finished, reminders go out
   7, 2 and 1 days before. When they finish, BL issues its certificate: **online part complete, bring
   this to your practical day**. There is no practical sign-off in BL.
7. The practical day and the real PHECC certificate happen outside both systems, as today.
   There is **no link to Richard's Pulse8 app**.
8. Changes:
   - **Full refund in Stripe:** the website sends `booking.refunded` and BL cancels access and the
     booking for every attendee.
   - **Partial refund:** a staff email only, with no automatic change.
   - **Admin edits a course or a day in BL:** BL sends `course.changed` and the website refreshes it.

## Shared contract, v2. Both lanes build to exactly this

Base: `docs/website-integration.md` (v1, live). The changes are below. Signing is the same everywhere:
`x-pulse8-timestamp` plus `x-pulse8-signature: sha256=<hex HMAC-SHA256("<ts>.<payload>")>`, ±300 s, with
one shared secret. BL env: `BOOKING_WEBHOOK_SECRET`. Website env: `BLENDED_LEARNING_SECRET`.

### A. Course list with price (BL serves, website reads)
`GET /api/integrations/courses` stays public, and without a signature its response is unchanged.
**Signed** GET: the payload signed is `"<ts>.GET /api/integrations/courses"`. Each course then also
carries:
```json
"price": { "amount_cents": 27500, "currency": "eur" }   // or null when no price is set
```
`course.changed` (server to server, already signed) carries the same `price` inside `data.course`.
Prices never reach a public response (Tom's rule: no public prices).

### B. Group bookings (website sends, BL handles)
`booking.confirmed` `data` gains optional fields:
```ts
attendees?: { email: string; first_name: string; last_name?: string; phone?: string }[]  // 1–6, unique emails
amount_paid_cents?: number
```
- With `attendees`, **each attendee** is enrolled, booked onto `practical.session_id` and emailed.
  `data.learner` is the buyer, who is not enrolled unless they are also an attendee.
- Without `attendees`, the behaviour is unchanged: `learner` is the one attendee.
- It is idempotent per `(booking_id, attendee email)`. A retry, or the same event id, changes nothing.
- `booking.refunded` and `booking.cancelled` for a `booking_id` cancel **every** attendee of it.
  Learning history is kept.
- A day that is already full still accepts a paid booking, which is already the case in
  booking-handler.ts:234. The admin sees it as over capacity.

### C. Course changes (BL sends, website receives)
The website endpoint is `POST /api/integrations/blended-learning`. It checks the signature over the
raw body, calls `revalidateTag("blended-courses")` and answers `200 {"ok":true}` within 10 s.
Anything unsigned or stale gets `401`. BL env `WEBSITE_WEBHOOK_URL` points at it.

### D. Ids
- `booking_id` is the website order id.
- Event ids are `web_<orderId>_confirmed` and `web_<orderId>_refunded`.
- Website session ids for BL days are `bl_<session_id>`.
- The key for a BL course on the website is the BL course `id`, never the slug.

## BL lane boxes

| Box | What | Done when |
|---|---|---|
| B1 | **Course price.** Additive column for price in cents (EUR), plus a "Price (€)" field in Admin → course → Details. Publishing a Public blended course without a price shows a warning, not a block. | Field saves and validates (≥ 0, 2 dp). Migration applied to prod **before** merging (Matthew signs in to Supabase in the browser pane when asked). |
| B2 | **Signed price** in the course list and in `course.changed` (contract A). | Unsigned response byte-identical to v1. Signed response has `price`. Bad or stale signature is treated as unsigned, with no error leak. |
| B3 | **`attendees[]`** (contract B), plus a refund or cancel covering every attendee. | Unit tests for 1 and 6 attendees, duplicate email, retry, refund, over capacity. |
| B4 | **Cohort max places default.** The new practical day form pre-fills 8 the first time and the course's last value after that. | Test plus a browser check. |
| B5 | **Certificate on online completion** for blended courses. No practical sign-off is needed. The certificate wording says it covers the online part and is brought to the practical day. Existing certificates are untouched. | Progress rule tests updated. Certificate page wording checked. |
| B6 | **Reminders before the practical day** for attendees who haven't finished online: 7, 2 and 1 days before, once each, through the daily cron. | Tests for the schedule and no duplicates. |
| B7 | **Docs and env.** `docs/website-integration.md` to v2. Set `WEBSITE_WEBHOOK_URL` and a fresh `BOOKING_WEBHOOK_SECRET` in Vercel (production), and give the same secret to the website lane through Vercel env only, never in chat, files or the vault. | Doc matches the code. |

## Website lane boxes

| Box | What | Done when |
|---|---|---|
| W1 | **Durable booking store.** Postgres behind the existing functions in `lib/booking/store.server.ts`, chosen by `BOOKING_DATABASE_URL`. The JSON file stays the store for dev and checks when it's unset. Holds and the last seat stay race-safe (a transaction and row lock or an advisory lock). Event claims stay unique. | `check:booking` passes against both stores. Provisioning a hosted Postgres is listed as a go-live step, not done silently. |
| W2 | **BL feed client** `lib/blended/feed.server.ts`. Signed GET (A), cached with tag `blended-courses` and revalidated hourly. It maps to `Course` and `Session` (`bl_` ids, delivery Blended, the real venue (widen `Venue`), capacity, and `seatsLeft = places_left − live website holds`, plus price). It's merged into `getPublicSessions` and `getBookableSession`. If BL is down or unconfigured, blended dates are simply hidden and nothing crashes. | Unit tests on mapping and failure. |
| W3 | **Blended course pages.** A website course with `blendedCourseId` (set it on `first-aid-response-blended`) keeps Mac's rich page and gets BL's days. Any other BL course gets a page generated from the feed: title, summary, description, image, length and certificate. All appear in `/courses` under Blended. The "Blended learning" menu item leads to them all. Replace "theory on the Pulse 8 e-learning portal" with our wording: the online part is on Pulse 8 Blended Learning, with the login emailed after booking. Keep Mac's design system: one red accent, radius rules, both themes, motion rules. | A browser check at 375 px and desktop, light and dark. |
| W4 | **Checkout for blended days.** 1–6 places, each with attendee name and email (the first pre-filled from the buyer). The amount is server-side from the feed price. Places are checked with a fresh, uncached feed read at checkout. The order stores attendees, BL session id and BL course id. | `check:booking` cases: price from feed, no price → enquire, full day, attendee validation. |
| W5 | **Tell BL when paid.** After `markPaid`, send `booking.confirmed` (B) signed. Delivery is recorded on the order and retried on its own like the emails (a failed send never undoes a paid booking). Add a CRON_SECRET-protected retry route and a staff retry, and register the cron in `vercel.json`. | Cases: success, BL 5xx then retry, duplicate. |
| W6 | **Refunds.** Handle Stripe `charge.refunded`. A full refund sends `booking.refunded`, marks the order refunded and frees the places. A partial refund sends a staff review email only. Add the event to the README's webhook list. | Cases: full, partial, replay. |
| W7 | **Receive course changes** (C). | Cases: good signature revalidates, bad or stale gets 401. |
| W9 | **Hand-off for Mac.** A README section "Blended learning (November 2026)" in the same style as his "Booking, payments and email" section, a one-line pointer in `AGENTS.md`, and `docs/handoff-blended-learning.md` (see "Tone" below). | Committed with the work. |

Website env added: `BLENDED_LEARNING_URL` (`https://blendedlearning-ebon.vercel.app`, and `https://blendedlearning.pulse8.ie` once its DNS is live) and `BLENDED_LEARNING_SECRET`.

## Not in scope (stays as it is)
- Live payments. They stay off until Pulse 8's own Stripe account is connected (`BOOKING_PAYMENTS_ENABLED`, keys,
  `BOOKING_ALLOW_LIVE`). Until then every date shows "Enquire", exactly as now, so pushing to `main` is safe.
- Pointing pulse8.ie at the new site, real course prices for classroom courses, the shop order form,
  Resend sender set-up, and any change to Richard's Pulse8 app.

## Acceptance (Claude, after both lanes)
One cross-app run, locally: BL local stack plus the website with the Stripe mock and file store.
1. Create a course with a price and a day in BL.
2. It appears on the website's `/book` and course page with places left.
3. Book 2 places. The mock payment is signed and paid.
4. BL has 2 enrolments on that day and 2 emails in the local inbox, and the places drop by 2 on the
   website after a course change.
5. Full refund: both are cancelled in BL.
6. Failure case: BL down at payment time. The booking stays paid, and the retry delivers it later.

## Tone of the hand-off in Mac's repo
Warm, credit-giving and factual, so his agent would summarise it as "Matthew has built out the
blended learning link (live course dates, places and prices from Blended Learning), group bookings
and refunds on top of your Stripe checkout, and a durable booking store." Lead with what it adds to
his work, say his existing Stripe flow, emails and design were reused rather than replaced, list the
env vars and the go-live steps that are still his and Pulse 8's call, and invite changes. Don't
apologise and don't hedge.
