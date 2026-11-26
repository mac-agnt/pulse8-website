# Hand-over: take the Pulse 8 website live, end to end

Written 26 November 2026 for the next Claude session. Read this first, then the
files it points to. Everything below was built and checked in earlier
sessions; what's left is set-up in outside services (Supabase, Resend, Stripe,
Vercel, Blacknight DNS). Matthew has installed the Stripe and Blacknight
plugins for you.

**Ground rules**
- Every change in an outside service (DNS, Stripe, Vercel variables, Supabase
  SQL) is Matthew's call: show him exactly what you will change and wait for
  his go-ahead each time. DNS mistakes take pulse8.ie's site or email down.
- Secrets (passwords, API keys, webhook secrets) go only into Vercel
  environment variables marked **Sensitive**. Never into the repo, a doc or the
  chat.
- Never run `npm run check:booking` against the Supabase project: it drops its
  tables. It refuses hosted Supabase URLs anyway.
- Before each push: `npm run lint && npm run typecheck && npm run build && npm run check:booking`.

## Where everything is

| What | Where |
| --- | --- |
| Website repo (Next.js 16, deployed by Vercel from `main`) | `C:\Users\Matthew Amiadamen\saol\consulting-ie\pulse8-website`, GitHub `mac-agnt/pulse8-website`, live at https://pulse8-website.vercel.app |
| Blended Learning (BL) repo and app | `C:\Users\Matthew Amiadamen\saol\consulting-ie\blendedlearning`, live at https://blendedlearning-ebon.vercel.app (its Supabase project is also the website's database) |
| Database and email steps, with prices | `docs/go-live-database-email.md` |
| Supabase role script | `docs/sql/website-db-role.sql` |
| How booking, payments, shop, student login work; every env variable | `README.md`: sections "Booking, payments and email", "Blended learning", "Shop checkout and student login", "Before this goes live" |
| BL link hand-off for Mac (the original developer) | `docs/handoff-blended-learning.md`, `docs/blended-learning-plan.md` |
| Session notes from both lanes | `C:\Users\Matthew Amiadamen\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_fd30c375-1d0a-4fea-a0a9-0dc903aaa83c\` (`website-lane.md`, `website-link-bl-lane.md`) |
| People, decisions, what Pulse 8 were asked for | Matthew's vault: `C:\Users\Matthew Amiadamen\saol\jarvis\vault\pulse8-go-live.md` |

Recent website commits: `4e85844` BL link, `759ff63` shop checkout + student
login, `23a8435` PHECC logo rules, `4a50cf1` Supabase database set-up.

## What the site does today (payments off)

- Course dates on `/book`: classroom dates plus BL practical days. With
  payments off every date says "Enquire".
- Shop: the basket sends an **order request** by email to staff (no payment).
- Student login menu: BL sign-in, Videotile, p8courses.
- Enquiry form emails staff.
- Nothing is stored or emailed in production yet: `BOOKING_DATABASE_URL`,
  `RESEND_API_KEY` and `MAIL_FROM` are unset, so the shop and enquiry forms
  show an honest "couldn't send" error until steps 1 and 2 are done.

## The go-live, in order

### 1. Database (Supabase, BL project)

Full steps in `docs/go-live-database-email.md` ("Matthew's steps"). In short:
Matthew runs `docs/sql/website-db-role.sql` in Supabase SQL Editor with his own
password (letters and digits only); Connect > **Transaction pooler** (port
6543) string, user changed to `website_app.<project-ref>`; set
`BOOKING_DATABASE_URL` (Sensitive) in Vercel; optional `BOOKING_DATABASE_CA`;
redeploy. Tables appear in schema `website` on the first booking or order.
Do not add `website` to Supabase's exposed schemas.

### 2. Email from pulse8.ie (Resend)

Pulse 8 already has a Resend account (info@pulse8.ie; Richard sent Matthew an
API key). Check in Resend > Domains whether `pulse8.ie` is verified.
- If not: add it (region Ireland), copy the records Resend generates into
  Blacknight DNS for pulse8.ie (a DKIM TXT under `resend._domainkey`, and MX +
  SPF TXT on `send.pulse8.ie`; they don't touch the root MX, so existing
  mailboxes keep working), wait for "Verified". Add DMARC
  `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:info@pulse8.ie;` only if none
  exists.
- Make a website-only API key (Sending access, pulse8.ie) and set in Vercel:
  `RESEND_API_KEY` (Sensitive) and `MAIL_FROM="Pulse 8 <bookings@pulse8.ie>"`.
  **The From must be on pulse8.ie**, never Resend's test sender
  (`onboarding@resend.dev`) or a vercel.app address. Replies already go to
  info@pulse8.ie. `BOOKING_STAFF_EMAILS` defaults to info@pulse8.ie.
- Check BL's own sender too (BL repo env, its Resend `from`): it should also
  be on pulse8.ie, not a test sender. Ask Matthew before changing BL.
- Test: send the enquiry form on the live site, confirm both emails arrive
  from the pulse8.ie address and pass SPF/DKIM (Gmail "Show original").

### 3. `CRON_SECRET`

Set any long random value (Sensitive) in Vercel. The daily cron
(`vercel.json`) retries messages BL didn't receive; without it the cron is
refused.

### 4. Stripe (test mode first)

**No Stripe Products or Prices need creating.** The site sends the amount for
each checkout itself (`price_data`), from server-side figures:
- classroom courses: `lib/course-prices.server.ts` (or the admin dashboard).
  **These are placeholders: Pulse 8 must give real prices before payments go
  on.**
- blended practical days: the price set in BL's admin for each course;
- shop: `lib/shop.ts` (the real published prices) plus delivery from
  `lib/shop-delivery.ts`, **a flagged €0 placeholder until Tom gives the
  delivery charge**.
Products in Stripe are only worth creating if Pulse 8 want them for reporting;
the code doesn't read them.

What Stripe needs:
1. Pulse 8's own Stripe account (Matthew asked for a Developer invite).
   Business details, statement descriptor ("PULSE 8"), branding and
   **customer email receipts** on, in Settings.
2. Test mode first: in Vercel set `STRIPE_SECRET_KEY` (sk_test_…),
   `BOOKING_PAYMENTS_ENABLED=1`, `SITE_URL=https://pulse8-website.vercel.app`.
3. Webhook endpoint `https://<site>/api/stripe/webhook` with exactly these
   events: `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`,
   `charge.refunded`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Test end to end with card 4242 4242 4242 4242: a classroom booking, a BL
   blended day (BL must then email the attendee), a shop order. Check staff
   and customer emails, `/book/return` and `/cart/return`, and the rows in
   Supabase `website` tables. Refund one in Stripe: the booking frees its
   places and BL is told.
5. Live: only after real prices and Matthew's go-ahead. `sk_live_…` key,
   live webhook (same events, new secret), and `BOOKING_ALLOW_LIVE=1` (the
   site refuses live keys without it). One small real purchase and refund to
   confirm.

### 5. Point pulse8.ie at the new site (Blacknight DNS + Vercel)

pulse8.ie is still the old WordPress/WooCommerce site at Blacknight. Every old
URL already redirects to its new page (`next.config.ts`).
1. Vercel > pulse8-website > Settings > Domains: add `pulse8.ie` and
   `www.pulse8.ie` (pick one as primary, redirect the other). Vercel shows
   the exact records to add.
2. Blacknight DNS: change only the website records: the apex `A` record (and
   any `AAAA`) for `pulse8.ie` and the `www` record, to what Vercel shows
   (usually `A 76.76.21.21` and `CNAME cname.vercel-dns.com`). **Leave MX, the
   Resend records, SPF/DMARC and any other subdomains untouched.** Write down
   the old values first so it can be rolled back. Lower the TTL beforehand if
   possible.
3. After it resolves and Vercel has issued the certificate, update:
   `SITE_URL=https://pulse8.ie` (and `SITE_URL_ALLOWLIST` if both www and the
   vercel.app URL should still work), the Stripe webhook URL, and BL's
   setting for where it sends course changes
   (`https://pulse8.ie/api/integrations/blended-learning`, in the BL repo's
   env). Redeploy both.
4. BL's own domain `blendedlearning.pulse8.ie`: a CNAME at Blacknight to what
   Vercel shows for the BL project; then set the website's
   `BLENDED_LEARNING_URL=https://blendedlearning.pulse8.ie` and redeploy.
5. Check: home, `/book`, `/shop`, an old WordPress URL (it should redirect),
   student login links, and that email still flows.

## Environment variables (Vercel, pulse8-website)

| Variable | State on 26 Nov | Set to |
| --- | --- | --- |
| `BLENDED_LEARNING_URL`, `BLENDED_LEARNING_SECRET` | set | URL changes in step 5.4 |
| `BLENDED_LEARNING_COURSE_LINKS` | unset | `first-aid-response-blended=<BL course id>` once that BL course exists |
| `BOOKING_DATABASE_URL` (+ optional `BOOKING_DATABASE_CA`) | unset | step 1 |
| `RESEND_API_KEY`, `MAIL_FROM` | unset | step 2 |
| `BOOKING_STAFF_EMAILS` | unset (= info@pulse8.ie) | only if staff want other addresses |
| `CRON_SECRET` | unset | step 3 |
| `BOOKING_PAYMENTS_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BOOKING_ALLOW_LIVE` | unset | step 4 |
| `SITE_URL`, `SITE_URL_ALLOWLIST` | check | step 4, then 5.3 |
| `ADMIN_PASSWORD` | check | the staff dashboard `/admin` needs it |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | optional | digits with country code |

**Known gap: the `/admin` dashboard can't save on Vercel.** It writes
`content/site-content.json` to disk (`lib/content.server.ts`), and Vercel's
file system is read-only and per-instance, so edits to copy, courses, course
prices and dates won't persist in production. Fix before staff rely on it:
store that content in Supabase schema `website` (same pattern and privacy
rules as `lib/booking/store-pg.server.ts`).

There is also **no admin for shop products**: all 49 live in `lib/shop.ts`
(photos in `/public/shop`), so adding or repricing a product is a code change
and a deploy. Matthew is considering a Products panel in `/admin` (add, edit,
hide, price, category, size options, photo upload), reading from Supabase;
`lib/shop-pricing.ts` would then price from the database. Build the content
storage fix first, then this, only once Matthew says go.

**Full admin, wanted end to end (Matthew, 26 Nov; after go-live, in the
background).** In priority order:
1. Saving that persists (Supabase), and staff logins per person (Supabase
   Auth) in place of the one shared `ADMIN_PASSWORD`, with a log of who
   changed what.
2. Orders: shop orders and order requests in a list; confirm, mark
   dispatched (tracking, emails the customer), cancel, refund through Stripe,
   notes, resend emails.
3. Bookings: per course date, attendee list (print / CSV), cancel and refund,
   move to another date, add a manual booking (phone, invoice or PO), mark
   attended.
4. Products: the Products panel above, plus stock / out of stock and editable
   delivery rates.
5. Course dates and prices (the existing Courses and Calendar panels, made to
   persist), closing a date, private group dates.
6. Enquiries: stored with a status (new, quoted, booked) instead of email only.
7. Discount codes (Stripe promotion codes) and VAT receipts or invoices for
   companies.
8. Reports: sales by month, bookings by course, CSV export for accounts.
9. Site settings: announcement bar, contact details, staff notification
   emails, payments on or off; editing FAQs, testimonials and images.
Blended learning keeps its own admin (BL repo); link to it from here.

## Still waiting on Pulse 8 / Matthew

- Real classroom course prices (`lib/course-prices.server.ts`).
- Shop delivery charge (Tom) for `lib/shop-delivery.ts`.
- PHECC: the year first recognised (2010 is unconfirmed, `phecc.year` in
  `lib/brand.ts`) and PHECC's master logo file.
- Whether the home page's shop "Supplies" section counts as "service
  provision" under PHECC's logo rules (logo kept on the home page for now).
- Durations of three courses flagged `unverifiedDuration` in `lib/data.ts`.
- Stripe account access; Blacknight access (now via the plugin).
- Students' 30-day vs no deadline for BL's online part (Tom said 30 days,
  Matthew decided none on 16 Nov: confirm).

## Done means

A customer on https://pulse8.ie can book and pay for a classroom course, a
blended day (and get BL's sign-in email), and shop items; every email comes
from pulse8.ie; staff get their notifications; refunds work; the orders sit in
Supabase schema `website`; old pulse8.ie links redirect; and Pulse 8's mail
still works.
