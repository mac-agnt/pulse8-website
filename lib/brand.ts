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
 * The accreditation group under the hero buttons.
 *
 * PHECC's mark is the one already on the site. The ATI artwork, exact label,
 * minimum size and clear space are waiting on Pulse 8; add the file here as
 * `ati` when it arrives and the hero picks it up. The label itself is the
 * editable hero eyebrow in the dashboard.
 */
export const heroAccreditation: { phecc: Artwork; ati: Artwork | null } = {
  phecc: { src: "/brand/phecc.png", width: 625, height: 326, alt: "PHECC" },
  ati: null,
};
