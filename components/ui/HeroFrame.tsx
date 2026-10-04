"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * Hero shell. Opens as a full-bleed photograph; as the page scrolls, a white
 * border grows in around it and the corners curve.
 *
 * The hero is pinned for a short run of scroll (the spacer under it) so the
 * frame is visible on all four sides while it forms, then it releases and
 * scrolls away normally. The border is the photograph being clipped smaller
 * over a white track, so only clip-path changes: no layout, no resize of the
 * image. Inset and radius are tokens in globals.css.
 *
 * Smoothness. A mouse wheel moves the page in notches of about 100px, and the
 * run is under half a screen, so driving the frame straight off scroll position
 * formed it in three or four visible jumps. The progress goes through a spring
 * first, overdamped so it never overshoots, which turns those notches into one
 * glide and gives trackpad scrolling a little weight. The photograph sits on
 * its own layer and settles from a fractional zoom as the frame closes, so the
 * picture moves with the border instead of being cut by it; that is a GPU
 * transform, it never repaints the image.
 *
 * Reduced motion is handled in CSS, not here: the tree has to match on the
 * server and the client. There the hero is unpinned and shows the framed state.
 */
export function HeroFrame({
  media,
  children,
}: {
  /** Photograph and scrim. Clipped by the frame, absolutely positioned inside it. */
  media: ReactNode;
  /** Copy. Sits above the frame and is never clipped. */
  children: ReactNode;
}) {
  const track = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: track,
    offset: ["start start", "end end"],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.6,
    restDelta: 0.0005,
  });

  const clipPath = useTransform(
    progress,
    (p) =>
      `inset(calc(${p} * var(--frame-inset)) round calc(${p} * var(--frame-radius)))`,
  );
  const scale = useTransform(progress, [0, 1], [1.04, 1]);

  return (
    <section id="top" ref={track} className="hero-track">
      <div className="hero-pin">
        <motion.div className="hero-media" style={{ clipPath }}>
          <motion.div className="hero-zoom" style={{ scale }}>
            {media}
          </motion.div>
        </motion.div>
        {children}
      </div>
      <div aria-hidden="true" className="hero-run" />
    </section>
  );
}
