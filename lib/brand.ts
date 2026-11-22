/**
 * Brand artwork, in one place so the approved files can be swapped in without
 * touching the header or footer.
 *
 * Two Pulse 8 logo candidates exist (a horizontal lockup and a circular mark)
 * and Pulse 8 has not yet said which is the master. These are the horizontal
 * lockups already on the site: `onLight` for the solid header, `onDark` for
 * the transparent bar over the hero and for the footer. Width and height are
 * the files' intrinsic size, so the browser reserves the right box.
 */
export type Artwork = { src: string; width: number; height: number; alt: string };

export const logo: { onLight: Artwork; onDark: Artwork } = {
  onLight: { src: "/brand/pulse8-logo.png", width: 554, height: 154, alt: "Pulse 8" },
  onDark: { src: "/brand/pulse8-logo-light.png", width: 554, height: 154, alt: "Pulse 8" },
};

/**
 * PHECC's mark, used under PHECC policy POL007 (v2). PHECC's register lists
 * "Pulse 8 Responder Ltd" as a Recognised Institution (not an "Approved
 * Training Institute"), for CFR Community, Emergency Medicines (Epinephrine)
 * and First Aid Response. The policy's rules, all applied by PhecMark:
 *
 *   - the mark always appears with the Appendix 1 text below (name,
 *     "Recognised at level of" the highest approved level, and the year);
 *   - on the web it links to https://www.phecc.ie;
 *   - it is never the dominant logo on a page, keeps clear space round it and
 *     is only scaled in proportion;
 *   - the artwork is never redrawn, trimmed, recoloured or combined with
 *     other marks (it sits on its own white plate, whatever the background);
 *   - it is for training only: keep it off pages that advertise service
 *     provision (the shop pages don't carry it).
 *
 * The file is the artwork from the old site's footer, which matches PHECC's
 * own header. PHECC asks for its master artwork; Pulse 8 have been asked for
 * it. Replace the file (same name) when it arrives.
 */
export const phecc = {
  mark: { src: "/brand/phecc.png", width: 625, height: 326, alt: "PHECC, Pre-Hospital Emergency Care Council" },
  href: "https://www.phecc.ie",
  institution: "Pulse 8 Responder Ltd",
  level: "First Aid Response",
  /**
   * PENDING Pulse 8's confirmation: 2010 is the old site's own claim. Tom has
   * been asked for the year PHECC first recognised Pulse 8.
   */
  year: "2010",
} as const;
