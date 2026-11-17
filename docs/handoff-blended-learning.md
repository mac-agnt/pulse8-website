# Blended learning: hand-off (17 November 2026)

Mac, Matthew has built out the blended learning link on top of your rebuild:
live course dates, places and prices from Pulse 8 Blended Learning, group
bookings and refunds on top of your Stripe checkout, and a durable booking
store. Your Stripe flow, holds, emails, checks and design were reused rather
than replaced, so it should all feel familiar. The "Blended learning (November
2026)" section of the README is the map; `docs/blended-learning-plan.md` is the
plan it was built to.

## What it adds

- **Blended dates on `/book`.** Practical days from Blended Learning sit
  alongside your own dates, with BL's places left (less your live holds) and
  BL's price, read server-side only. Public pages still carry no prices, and
  your price-leak check now covers the blended pages too.
- **Blended courses.** `first-aid-response-blended` keeps your page and copy
  and gets BL's dates once it is linked (below). Any other BL course gets a
  page of its own, built from BL's description, plus a card in the new
  "Blended learning" section of `/courses`. The nav's "Blended learning" item
  points there.
- **Group bookings.** A blended booking takes 1 to 6 attendees. Your checkout,
  holds and last-seat race handle the places as before. BL receives one signed
  `booking.confirmed` and emails each attendee their sign-in. Your receipt and
  staff emails now list the attendees.
- **Refunds.** `charge.refunded` in your webhook: a full refund marks the
  booking refunded, frees its places and tells BL; a part refund sends staff
  one review email and changes nothing else.
- **Durable store.** `store.server.ts` keeps its functions and gains a
  Postgres back end (`BOOKING_DATABASE_URL`) beside your JSON file, which stays
  the default for development.
- **Nothing lost if BL is down.** Blended dates hide and the rest of the site
  works. A paid booking BL didn't receive is retried by a daily cron or by staff
  (`POST /api/admin/bookings/<ref>/blended-learning`, behind your admin auth),
  always with the same event id.

## Checks

`npm run lint && npm run typecheck && npm run build && npm run check:booking`
all pass. `check:booking` runs 192 checks (your original set plus the blended
ones, against a mock BL) and 47 unit tests first. With
`BOOKING_CHECK_DATABASE_URL` set to a throwaway Postgres, it runs the whole
suite again on the Postgres store: 384 of 384 passed. One small change to your
script: it now starts Next through `node` so it runs on Windows as well.

## Environment

| Variable | State |
| --- | --- |
| `BLENDED_LEARNING_URL` | Set in Vercel production: `https://blendedlearning-ebon.vercel.app`. Switch to `https://blendedlearning.pulse8.ie` once that domain is live (the old URL keeps working). |
| `BLENDED_LEARNING_SECRET` | Set in Vercel production (Sensitive). The same value as BL's `BOOKING_WEBHOOK_SECRET`. |
| `BLENDED_LEARNING_COURSE_LINKS` | Not set. `first-aid-response-blended=<BL course id>` links your FAR blended page to its BL course. |
| `BOOKING_DATABASE_URL` | Not set. Hosted Postgres for bookings. |
| `CRON_SECRET` | Not set. Until it is, the retry cron refuses every call. |

BL already sends its course-change messages to
`https://pulse8-website.vercel.app/api/integrations/blended-learning`.

## Go-live steps (yours and Pulse 8's call)

1. **Hosted Postgres.** Create one (Supabase, Neon or another provider through
   Vercel) and set `BOOKING_DATABASE_URL` before payments go on. The tables
   create themselves on first use.
2. **`CRON_SECRET`.** Set any long random value; Vercel sends it with the cron.
   The cron runs daily (`vercel.json`) to suit the Hobby plan; on Pro it can
   run hourly.
3. **Link FAR blended.** Set `BLENDED_LEARNING_COURSE_LINKS` (or
   `blendedCourseId` in the dashboard) once its BL course exists, and set its
   price in BL's admin.
4. **Stripe.** Payments stay off for now, so every date, blended ones
   included, shows "Enquire" as before. When Pulse 8's Stripe account is
   connected, add `charge.refunded` to the webhook's events alongside your four.
5. **Domain.** When `blendedlearning.pulse8.ie` is live, update
   `BLENDED_LEARNING_URL` and redeploy.

Change anything you'd do differently. The checks cover the behaviour, so
they'll tell you if a refactor keeps it.
