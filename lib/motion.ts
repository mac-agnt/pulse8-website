import type { Transition, Variants } from "framer-motion";

/**
 * Motion budget for this site: MOTION_INTENSITY 5.
 * Enter transitions, scroll reveals, hover lifts. Transform and opacity only.
 * Every animation degrades to a static final state under prefers-reduced-motion.
 */

export const ease = [0.16, 1, 0.3, 1] as const;

export const duration = {
  fast: 0.25,
  base: 0.5,
  slow: 0.7,
} as const;

export const transition: Transition = {
  duration: duration.base,
  ease,
};

export const viewport = { once: true, amount: 0.25 } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition },
};

export const stagger = (delayChildren = 0, staggerChildren = 0.07): Variants => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
});
