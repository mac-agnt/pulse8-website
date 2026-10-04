# Pulse 8 website

A rebuild of pulse8.ie. Same company, same courses, same accreditation, same
shop, new front end. Everything public on the old WordPress site has a home
here, and every old URL redirects to it.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Stack

Next 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind v4,
Framer Motion, Phosphor icons. Matches the stack in `Pulse8-demo`.

## Structure

```
app/
  layout.tsx             fonts, metadata, pre-paint theme script
  page.tsx               home page section order (FAQ is the last section)
  globals.css            colour and radius tokens, marquee, reduced-motion overrides
  courses/               all courses, online courses band, /courses/<slug> pages
  shop/                  store index and /shop/<category>
  product/[slug]/        product pages, same URL as the old WooCommerce store
  cart/                  basket and order request
  about/  contact/       ported company pages
  policies/              index, cancellation, privacy and cookie policies
  book/                  course dates calendar
  admin/                 content dashboard
components/
  sections/              one file per band of the home page
  shop/                  store cards, gallery, basket, order form
  policies/              policy article renderer
  layout/PageShell.tsx   header, announcement and footer for inner pages
  ui/                    Button, Reveal, PageIntro
lib/
  data.ts                courses, sectors, clients, testimonials, FAQ, nav
  course-details.ts      long-form course page content
  shop.ts                every product, price and category
  basket.ts              client basket store (localStorage)
  policies.ts            policy text and learner policy PDFs
  motion.ts              easing, durations, viewport settings
next.config.ts           redirects from every old pulse8.ie URL
public/                  images and PDFs pulled from pulse8.ie
```

## Design decisions

- **One accent.** The red from the Pulse 8 pulse line. Navy is structure, not a
  second accent. Both are taken from the existing brand.
- **Two themes.** Light and dark are both first class. The theme is written to
  the html element before paint, so there is no flash, and a toggle sits in the
  header. Section bands tint within one theme rather than inverting mid-page.
- **One radius system.** Buttons and inputs 10px, cards and media 16px, chips
  fully rounded. Nothing else gets a radius.
- **Motion.** Enter and scroll reveals, hover lifts, animated course filtering.
  Transform and opacity only. Everything collapses to a static final state under
  `prefers-reduced-motion`, including the logo band.
- **Type.** Lexend, the typeface already in use on the live site.

## Content that came from the live site

Ported from pulse8.ie in October 2026, through its WordPress and WooCommerce
APIs, so nothing was retyped by hand:

- **Courses.** Titles, durations, class sizes, delivery modes, certificates and
  photography, plus the full body of every course page (syllabus, who should
  attend, certification, what you receive) in `lib/course-details.ts`. Spelling
  was corrected; wording was not changed. The short card descriptions were
  rewritten from those pages.
- **Online courses.** The "Buy now" links to the Pulse 8 e-learning portal on
  videotilehost.com, for the eight courses the old site sold online.
- **Shop.** All 49 products across 11 categories, with prices, descriptions and
  photographs (now in `/public/shop`). The nitrile gloves keep their size
  choice. Names were moved out of capitals and supplier typos fixed.
- **Testimonials.** The three published reviews, word for word, with the job
  titles the old site gave them.
- **FAQ.** The nine questions from /faqs, now the last section of the home page.
- **Policies.** The twelve learner policy PDFs (now in `/public/documents`) and
  the cancellation and privacy policies word for word. The cookie policy was
  adapted, see below.
- **About and contact.** The old about page copy, the "trusted nationwide"
  figures and the client logos; the quote form's extra fields (group or
  individual, course, county).

Not ported: the WooCommerce account and checkout pages, and the theme's demo
FAQ items under /faq-items, which were never Pulse 8 content. Both redirect.

## Deploying to Vercel

Import the repository in Vercel; the defaults (Next.js preset, `npm run build`)
are right and no `vercel.json` is needed.

- **`ADMIN_PASSWORD`** (optional). The content dashboard at `/admin` is open in
  development only. In production `proxy.ts` puts it behind basic auth using
  this variable (any user name). Leave it unset and `/admin` and its API return
  404.
- **Dashboard saves do not persist on Vercel.** It writes
  `content/site-content.json`, and Vercel's file system is read-only, so a save
  there returns a clear "saving is not available" message. Make content edits
  locally, commit the file, and redeploy, or move storage to a service such as
  Vercel Blob before relying on the dashboard in production.
- `sitemap.xml` and `robots.txt` are generated for `https://pulse8.ie`, and
  every old WordPress URL redirects (see `next.config.ts`).

## Before this goes live

1. **Confirm four durations.** `patient-moving-handling-course` (18 hours),
   `workplace-health-and-safety` (18 hours) and `vdu-training` (24 hours) all
   carry what looks like a copy-paste of the 18-hour First Aid Response entry on
   the current site. They are flagged `unverifiedDuration: true` in
   `lib/data.ts`.
2. **Wire the quote form.** `components/sections/QuoteForm.tsx` holds a sending
   state and then reports success without posting anywhere. Point it at the
   Gravity Forms endpoint or a route handler.
3. **Wire the shop order form.** `sendOrderRequest` in
   `components/shop/OrderRequestForm.tsx` waits and then succeeds; the typed
   order (customer, lines, subtotal) is already assembled for it. The old store
   took card payments through Stripe, so the likely next step is a Stripe
   Checkout session from a route handler, in place of the order request.
4. **Review the cookie policy.** Sections 1 to 4 and the rights section are the
   old text. The old list of cookies described WordPress, WooCommerce,
   Complianz and Sourcebuster, none of which run here, so it was replaced with
   what this site actually stores (three browser storage entries, no tracking).
   Have whoever owns compliance sign it off, and update it if analytics are
   added.
5. **Accreditation marks.** Only PHECC supplied a logo. HSA, CPD, IIRSM, IOSH and
   Gatehouse Awards are set as wordmarks rather than invented marks. Swap in real
   artwork when the client provides it.
6. **Google rating and figures.** The 5.0 rating, 4,000+ students, 200+ clients
   and 100% satisfaction all come from the current site's own claims. Check they
   still hold before publishing.
7. **Course prices.** Still placeholders, see the note at the top of
   `lib/data.ts`. Shop prices are the real published ones.
