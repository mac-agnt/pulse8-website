# Go-live: database and email

Prepared 22 November 2026, updated the same day when Matthew chose the
Blended Learning Supabase project for the database. Nothing here has been
created yet: Matthew runs the SQL and sets the Vercel variables. Prices are as
published on 22 November 2026, in US dollars as the pages show them.

The website needs both before payments go on in production:

- **A Postgres database** (`BOOKING_DATABASE_URL`). Vercel has no writable disk
  and runs several copies of the site at once, so the JSON file store only
  works on a laptop. Bookings, shop orders and the "event already handled"
  records all live in it. The tables create themselves on first use.
- **An email sender** (`RESEND_API_KEY`, `MAIL_FROM`). Booking confirmations,
  shop order emails, staff notifications and the enquiry form all send
  through it. Without it production refuses to send rather than pretending.

## Database: the Pulse 8 Blended Learning Supabase project

Decided by Matthew on 22 November 2026: the website keeps its bookings and
shop orders in the **existing Pulse 8 Blended Learning Supabase project**. No
new account and no extra cost. That project is in daily use, so the free
plan's pause after a week of inactivity doesn't apply.

**Kept apart from Blended Learning, and private.** The tables hold customers'
names, emails and delivery addresses, and Supabase publishes its `public`
schema through a REST API. So the website's three tables (`booking_orders`,
`shop_orders`, `booking_events`) live in their own schema, `website`:

- `website` is **not** one of Supabase's exposed schemas. Leave it out of
  Settings > API > Exposed schemas.
- Every table has row level security on with no policies, and Supabase's API
  roles (`anon`, `authenticated`, `service_role`) have no rights on the schema
  or its tables. Even if `website` were exposed by mistake, the API would
  return nothing.
- The website connects as its own login, `website_app`, which can only use
  the `website` schema. It can't read or change Blended Learning's tables.
- The website's code names every table in full (`website.booking_orders`), so
  nothing depends on a search path.

`npm run check:booking` tests all of this against a local copy of Supabase's
Postgres (10 privacy checks on top of the 246 booking and shop checks). It
drops its tables between runs, so it refuses any hosted Supabase address:
never point it at the Blended Learning project.

### Matthew's steps

1. **Create the role.** Open `docs/sql/website-db-role.sql`. In the Supabase
   dashboard for the Blended Learning project, open SQL Editor and paste the
   script in. Replace the password placeholder with a long random password
   (letters and digits only) from your password manager, and run it. It
   refuses to run with the placeholder. The last result should show
   `website_app` true and the other three roles false. Don't save the real
   password in the repo.
2. **Get the connection string.** Click Connect > **Transaction pooler**
   (port 6543, IPv4: what Vercel needs). It looks like
   `postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres`.
   Change the user from `postgres.<project-ref>` to
   `website_app.<project-ref>` and put the step 1 password in place of
   `[YOUR-PASSWORD]`.
3. **Set it in Vercel.** pulse8-website > Settings > Environment Variables:
   `BOOKING_DATABASE_URL` = that string, marked **Sensitive**, for
   Production. A `?sslmode=require` on the end is fine either way: the
   website always uses TLS to a hosted database.
4. **Optional, stricter TLS.** Supabase > Database settings > SSL
   Configuration > download the CA certificate, and set its contents as
   `BOOKING_DATABASE_CA` (Sensitive). With it, the website also checks it is
   talking to Supabase's server. Without it, the connection is still
   encrypted.
5. **Redeploy.** The first booking or shop order creates the three tables in
   `website`, with row level security on.

To check afterwards: Table Editor > schema `website` shows the three tables
(you see them as `postgres`). Settings > API > Exposed schemas should still
list only what Blended Learning uses.

Pooler notes for whoever changes the code: transaction mode keeps no session
state and no named prepared statements. The store uses neither (only
transaction-scoped advisory locks, plain query strings) and keeps at most 3
connections per instance.

## Email: Resend, free plan, from pulse8.ie

| | Free | Pro |
| --- | --- | --- |
| Price | $0 | $20/month |
| Emails | 3,000 a month, **100 a day** | 50,000 a month, no daily limit |
| Domains | 3 | 10 |

The free plan is enough to start: a booking sends two emails, a shop order
two. The 100-a-day cap only matters on a very busy day, and a failed send is
recorded and can be retried from the admin endpoints, never lost.

**Pulse 8 already has a Resend account** (info@pulse8.ie, used by the
p8courses platform), and Richard has sent Matthew an API key. Matthew is
checking whether `pulse8.ie` is already verified there:

- **If it is verified:** skip steps 1 to 4. Ideally create a separate API key
  for the website in that account (Sending access, `pulse8.ie` only), so it
  can be revoked without touching p8courses. Richard's key also works. Then
  do step 5. Keys go only into Vercel (Sensitive), never into the repo or a
  chat.
- **If it isn't:** do the steps below in that same account. No new sign-up
  is needed, only the Blacknight DNS login.

1. Resend > Domains > Add domain `pulse8.ie`, region **Ireland (eu-west-1)**.
   The region sets where mail is sent from; Resend keeps account data and
   logs in the US whichever region is picked. Add that to the privacy policy's
   processor list.
2. Resend shows the records to add. Copy them exactly from its Records tab;
   they are generated per domain. Expect a DKIM `TXT` record under
   `resend._domainkey`, and an `MX` plus an SPF `TXT` record on the `send`
   subdomain (`send.pulse8.ie`, the return path). None of them touch the root
   `MX`, so Pulse 8's existing mailboxes keep working.
3. Add them in Blacknight's DNS manager for pulse8.ie. Verification usually
   takes about 15 minutes, up to 72 hours.
4. DMARC: check whether `_dmarc.pulse8.ie` already has a `TXT` record. If not,
   add `v=DMARC1; p=none; rua=mailto:info@pulse8.ie;` and tighten it later.
5. Create an API key with sending access only. In Vercel set
   `RESEND_API_KEY` and `MAIL_FROM="Pulse 8 <bookings@pulse8.ie>"` (any
   address on the verified domain; replies already go to info@pulse8.ie).
   Redeploy.

Resend recommends sending from a subdomain (for example `mail.pulse8.ie`) to
keep the website's sending reputation apart from staff email. That is the
cleaner option if Pulse 8 is happy for the From address to read
`bookings@mail.pulse8.ie`; verify that subdomain instead in step 1.

## Still to confirm

- **Delivery charge** for shop orders. Delivery is a flagged placeholder at €0
  until Tom sets the real rates in `/admin` > Prices.
- Whether `pulse8.ie` is already verified in Pulse 8's Resend account
  (Matthew is checking).
