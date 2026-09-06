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

If a mark arrives as a JPEG on white, knock the background out first: flood
fill inward from the border so white inside the mark survives, then crop to the
content box. The client logos in /public/clients were done that way.
