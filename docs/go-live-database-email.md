# Go-live: database and email

Prepared 22 November 2026. Nothing here has been created yet: each step needs
an account, so Pulse 8 (or whoever holds their logins) does it, or says who
may. Prices are as published on 22 November 2026, in US dollars as the pages
show them.

The website needs both before payments go on in production:

- **A Postgres database** (`BOOKING_DATABASE_URL`). Vercel has no writable disk
  and runs several copies of the site at once, so the JSON file store only
  works on a laptop. Bookings, shop orders and the "event already handled"
  records all live in it. The tables create themselves on first use.
- **An email sender** (`RESEND_API_KEY`, `MAIL_FROM`). Booking confirmations,
  shop order emails, staff notifications and the enquiry form all send
  through it. Without it production refuses to send rather than pretending.

## Database: Neon, free plan, through the Vercel Marketplace

Recommended: **Neon Free**, region **AWS Europe (London), `aws-eu-west-2`**
(closest to Ireland; Neon has no Irish region. Frankfurt, `aws-eu-central-1`,
also works). The region cannot be changed after creation.

| | Neon Free | Neon Launch | Supabase Free | Supabase Pro |
| --- | --- | --- | --- | --- |
| Price | $0 | pay as you go, about $15/month for a small database | $0 | from $25/month |
| Storage | 1 GB per project | $0.35/GB-month | 500 MB | 8 GB |
| Idle | sleeps after 5 min, wakes on the next request | sleep can be turned off | **paused after 1 week idle** | not paused |
| Limit that bites | 100 compute-hours a month | none at this size | 2 active projects | none at this size |

Why Neon Free: the site's data is a few thousand small rows, well under 1 GB,
and the traffic is light enough to stay inside 100 compute-hours. Supabase's
free plan pauses after a quiet week, which would break bookings, and Pulse 8
Blended Learning already uses one of the two free Supabase projects. Vercel's
own "Vercel Postgres" no longer exists; Neon is one of the providers on the
Vercel Marketplace that replaced it.

Cost to watch: the first request after 5 idle minutes waits for the database
to wake (usually under a second). If that, or the compute-hour limit, ever
matters, move to Launch (no minimum, about $15/month at this size).

Steps (needs the Vercel project owner):

1. Vercel dashboard > pulse8-website > Storage > Create > Neon. Choose the
   Free plan and London (`aws-eu-west-2`).
2. Connect it to the project for Production (and Preview, with its own branch
   if wanted). Vercel adds `DATABASE_URL` and related variables.
3. Add `BOOKING_DATABASE_URL` with the same value as the pooled
   `DATABASE_URL` (the site reads only `BOOKING_DATABASE_URL`). Redeploy.
4. First booking or shop order creates the tables `booking_orders`,
   `shop_orders` and `booking_events`.

Before trusting it: `npm run check:booking` with `BOOKING_CHECK_DATABASE_URL`
pointing at a **throwaway** database whose name contains `test` (the run drops
its tables). Never point that at the production database.

## Email: Resend, free plan, from pulse8.ie

| | Free | Pro |
| --- | --- | --- |
| Price | $0 | $20/month |
| Emails | 3,000 a month, **100 a day** | 50,000 a month, no daily limit |
| Domains | 3 | 10 |

The free plan is enough to start: a booking sends two emails, a shop order
two. The 100-a-day cap only matters on a very busy day, and a failed send is
recorded and can be retried from the admin endpoints, never lost.

Ask first: the p8courses platform already sends with Resend. If Pulse 8 (or
Richard) already has a Resend account with `pulse8.ie` verified, use that
account and skip the DNS step: create an API key there for the website.

Otherwise, steps (needs a Resend sign-up and the Blacknight DNS login):

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

## Still to confirm with Pulse 8

- **Delivery charge** for shop orders. Delivery is a flagged placeholder at €0
  in `lib/shop-delivery.ts` until Tom gives the real rates.
- Who owns the Vercel project and can add the database integration.
- Whether a Resend account for pulse8.ie already exists.
