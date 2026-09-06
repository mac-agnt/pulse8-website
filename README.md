# Pulse 8 website

A rebuild of the pulse8.ie landing page. Same company, same courses, same
accreditation, new front end.

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
  layout.tsx     fonts, metadata, pre-paint theme script
  page.tsx       section order
  globals.css    colour and radius tokens, marquee, reduced-motion overrides
components/
  sections/      one file per band of the page
  ui/            Button, Reveal, ThemeToggle
lib/
  data.ts        every course, sector, client and quote on the page
  motion.ts      easing, durations, viewport settings
public/          images pulled from the live pulse8.ie media library
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

Course titles, durations, class sizes, delivery modes, certificates, the client
list, the three testimonials and all photography are taken from pulse8.ie. The
short course descriptions were rewritten from the live course pages.

## Before this goes live

1. **Confirm four durations.** `patient-moving-handling-course` (18 hours),
   `workplace-health-and-safety` (18 hours) and `vdu-training` (24 hours) all
   carry what looks like a copy-paste of the 18-hour First Aid Response entry on
   the current site. They are flagged `unverifiedDuration: true` in
   `lib/data.ts`.
2. **Wire the quote form.** `components/sections/QuoteForm.tsx` holds a sending
   state and then reports success without posting anywhere. Point it at the
   Gravity Forms endpoint or a route handler.
3. **Accreditation marks.** Only PHECC supplied a logo. HSA, CPD, IIRSM, IOSH and
   Gatehouse Awards are set as wordmarks rather than invented marks. Swap in real
   artwork when the client provides it.
4. **Course links.** Cards link out to the existing pulse8.ie course pages. If
   those pages move into this app, change the `href` in `Courses.tsx`.
5. **Google rating.** The 5.0 figure comes from the current site's own claim.
   Check it still holds before publishing.
