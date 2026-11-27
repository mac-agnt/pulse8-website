# Website admin: what it does and how to give Tom his login

Plain-English guide for Matthew. Stage 1 of the full admin (27 November 2026).

## What Tom can do himself now

Go to **https://www.pulse8.ie/admin** and sign in.

- **Prices**
  - *Courses*: the price per person for every course Pulse 8 runs (classroom
    and blended). Leave a price blank and that course shows "Enquire" instead
    of "Book". Blended Learning courses are listed read-only with a link to
    BL's own admin, where their prices are set. Online (Videotile) courses are
    priced on Videotile.
  - *Shop products*: the price of each of the 49 products.
  - *Delivery and VAT*: a flat delivery charge per order, an optional "free
    over €X", Ireland only; and one VAT line shown in the basket and on
    product pages. Until Tom saves delivery here, orders show free delivery
    and staff emails flag it.
  - Only what he changes is saved; a bar at the bottom shows how many changes
    are waiting, with Save and Undo.
- **Course dates**: add a date (course, date, start and end time, how many
  days, how many places, venue, an optional price for that date only, a note
  for staff), change it, or **Close** it. A closed date leaves the booking
  page straight away; anyone already booked keeps their place. A date with no
  bookings can be deleted. Each date shows how many places are booked.
  Everything is live on /book as soon as it's saved.
- **Course descriptions** and **Site copy**: as before, and now they save
  for real on the live site.
- **Activity**: who changed what, and when (e.g. "Tom: Course price, Cardiac
  First Response: €95 → €100").
- **Your account**: set or change his password, sign out.
- Owners also get **Finance**: every payment the website takes, from course
  bookings, Blended Learning bookings and the shop, as charts. Revenue over
  time (per day, week or month), where it comes from, top courses and shop
  products, and the latest payments, after refunds. Test payments (while
  Stripe is in test mode) are shown separately and clearly marked.
- Owners also get **Staff logins**: add people, make them owner or staff,
  switch a login off, or email someone a sign-in link.

Roles: an **owner** can do everything, including Finance and logins.
**Staff** can do everything else, but can't see Finance or any payment amount
(the server refuses them, not just the menu), and can't manage logins. There
is always at least one owner.

Public pages still never show course prices; they only reach Stripe at
checkout.

## One-time set-up (Matthew)

Nothing to run in Supabase: the new tables (`admin_docs`, `staff_users`,
`staff_sessions`, `staff_login_tokens`, `staff_login_attempts`,
`admin_audit`) are created in the private `website` schema the first time the
admin is used, by the same `website_app` role as the booking tables, with the
same privacy settings (row level security on, nothing for Supabase's API
roles). At that moment the current course list, copy, dates and the
placeholder prices are copied in, so nothing is lost.

1. **Vercel > pulse8-website > Settings > Environment Variables**: add
   `ADMIN_PASSWORD` (mark it **Sensitive**), any long random value. It is
   only a one-time set-up password for the first owner. Redeploy.
2. Open **https://www.pulse8.ie/admin**. It shows "Create the owner login".
   Enter that set-up password, your name, your email and a password of your
   own (10+ characters). You are now the owner and signed in.
   (Once an owner exists, the set-up password does nothing. You can delete
   the variable afterwards.)
3. **Give Tom his login**: Staff logins > **Add a login** > Tom's name and
   email > role **Owner** (or Staff) and either:
   - leave **"Email them a sign-in link"** on: Tom gets an email with a
     one-time link (works for 15 minutes). He clicks it, presses Sign in, then
     sets a password under Your account. Needs website email working
     (`RESEND_API_KEY`, `MAIL_FROM` and `SITE_URL` set, as in the go-live
     steps); or
   - turn it off and type a starting password, and tell Tom it by phone (not
     email). He changes it under Your account.
4. Ask Tom to sign in and check Prices. The course prices there are still the
   placeholders until he changes them.

Already needed before this and still needed: `BOOKING_DATABASE_URL` (the
admin is stored there; without it the admin can't save on Vercel) and
`SITE_URL` (for sign-in links).

## If something goes wrong

- **Forgotten password**: on the sign-in page, "Email me a link"; or an owner
  presses "Email sign-in link" next to that person.
- **Too many wrong passwords**: sign-in for that email pauses for 15 minutes.
  The emailed link still works.
- **Someone leaves**: Staff logins > Switch off. They're signed out at once;
  their past changes stay in the activity log under their name.
- **"Someone else saved changes here"**: two people edited the same course
  descriptions or copy. Reload the page and make the change again.

## For developers

| Piece | Where |
| --- | --- |
| Sign-in, sessions, rate limits, roles | `lib/admin/auth.server.ts`, `app/api/admin/auth/*` |
| Storage (Postgres / dev JSON file) | `lib/admin/store-pg.server.ts`, `lib/admin/store-file.server.ts` |
| One-time import | `lib/admin/seed.server.ts` |
| Content read by the site | `lib/content.server.ts` (`readContent`, `readShopPriceList`) |
| Prices / dates / staff / activity APIs | `app/api/admin/{prices,dates,staff,activity}` |
| Screens | `components/admin/*Panel.tsx`, `app/admin/login` |

Sessions are an httpOnly cookie holding a random token (only its sha256 is
stored), 30 days at most and 7 days idle. Passwords are scrypt hashes.
Sign-in attempts are counted in the database (per email and per address,
keys hashed), so the limits hold across Vercel instances. Every `/api/admin`
route checks the session and refuses changes sent from other sites. Nothing
logs an email address, password or token. `npm run check:booking` covers
sign-in, roles, rate limiting, prices reaching Stripe Checkout, dates on /book
and the activity log, on the file store and (with
`BOOKING_CHECK_DATABASE_URL`) on Postgres.
