# Accreditation marks

Drop the official files here, then set `logo` on the matching entry in
`lib/data.ts` → `accreditations`. Anything without a `logo` renders as a plain
wordmark, so the band works either way.

Files here now (PNG, transparent, 240px tall):

| File                   | Taken from                                                    | Still needs                          |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------ |
| `cpd.png`              | cpduk.co.uk, `themes/custom/cpd/.../CPD_logo.svg`              | provider-portal member mark          |
| `iirsm.png`            | iirsm.org, `assets/iirsm_logo_grey_lettering.svg`              | approved-provider pack version       |
| `iosh.png`             | iosh.com, `img/og-logo.png`, white knocked out                 | portal mark for the approved course  |
| `gatehouse-awards.png` | gatehouseawards.org, `logo-black.png`, white knocked out       | centre-pack version                  |

These came from each body's own website, not a logo aggregator, so the artwork
is right. The **permission** is still open. They are licensed marks: IOSH says
its logo may only be reproduced with consent and only against the specific
approved programme, and CPD issues its mark to the approved provider directly.
The versions a provider is licensed to display are usually approval badges
("IOSH Approved", "CPD Member") rather than the plain corporate logos sitting
here. Before launch, replace each file with the one from Pulse 8's own portal
and keep the same filename, so nothing else has to change.

Not used: `gate-main-logo-...png` from the Gatehouse site is the GATE Test of
English product lockup, not the Gatehouse Awards corporate mark. `iosh-logo-alt.png`
is the white-on-dark variant, which disappears on this page ground.

`hsa.png` is deliberately not on the list. Pulse 8's own course copy says the
HSA "recognises the PHECC First Aid Response (FAR) training course as meeting
the needs of occupational first aid" — that is the HSA recognising a national
standard, not accrediting Pulse 8. An HSA logo in a row of approval badges
would claim something Pulse 8 does not hold. Keep it as the wordmark
"HSA recognised", or reword to name the FAR standard.

## PHECC

PHECC's mark is not in this folder and not in the row: it lives at
`public/brand/phecc.png` and appears only through `components/ui/PhecMark.tsx`
(the home page hero). PHECC policy POL007 (v2) sets the terms, and they are
listed in `lib/brand.ts`: the mark always carries its prescribed text
("Pulse 8 Responder Ltd / Recognised at level of First Aid Response / <year>"),
links to https://www.phecc.ie, is never the dominant logo, keeps clear space,
is never redrawn, trimmed, recoloured or combined with other marks, and stays
off pages that advertise service provision.

The policy calls for the **master artwork supplied** by PHECC. The current file
is the artwork from the old site's footer, which matches PHECC's own header;
Pulse 8 have been asked for the master. When it comes, replace
`public/brand/phecc.png` with it (same name; update `width` and `height` in
`lib/brand.ts`) and do not knock out, trim or recolour it. The year (2010) is
also pending Pulse 8's confirmation: `phecc.year` in `lib/brand.ts`.

## Preparing files

If a mark arrives as a JPEG on white, knock the background out first: flood
fill inward from the border so white inside the mark survives, then crop to the
content box. The client logos in /public/clients were done that way.
