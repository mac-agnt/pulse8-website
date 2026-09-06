"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ease, duration, viewport } from "@/lib/motion";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "article";
  /** Above the fold. Runs on mount instead of waiting for an intersection. */
  onMount?: boolean;
};

/**
 * Scroll reveal for a single block.
 *
 * Reduced motion is handled by MotionConfig in the layout, not by branching
 * here: the tree has to be identical on the server and the client.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  onMount = false,
}: RevealProps) {
  const Component = motion[as];

  const motionProps = onMount
    ? { animate: { opacity: 1, y: 0 } }
    : { whileInView: { opacity: 1, y: 0 }, viewport };

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: duration.base, delay, ease }}
      {...motionProps}
    >
      {children}
    </Component>
  );
}

/** Staggers direct children that are wrapped in RevealItem. */
export function RevealGroup({
  children,
  className,
  step = 0.07,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      variants={{ hidden: {}, show: { transition: { staggerChildren: step } } }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0, transition: { duration: duration.base, ease } },
      }}
    >
      {children}
    </motion.div>
  );
}
