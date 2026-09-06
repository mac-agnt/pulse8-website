"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

/**
 * `reducedMotion="user"` drops transform and layout animation for anyone who
 * asks for reduced motion, while opacity still resolves so content never gets
 * stranded invisible.
 *
 * It has to live here rather than in each component: branching a render on
 * useReducedMotion() produces a different tree on the server than on the
 * client, which is a hydration mismatch.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
