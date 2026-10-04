"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

/**
 * Headline that starts entirely grey and fills the emphasised words in ink,
 * one word after another, as the section scrolls into view.
 *
 * Words wrapped in *asterisks* are the emphasised ones. The fill is scrubbed by
 * scroll position, so it runs forward and back with the reader. Colour is the
 * only thing that animates. Reduced motion is handled in CSS (.hl-word), which
 * shows the final state, so the tree matches on server and client.
 */
const GREY = "oklch(80% 0.012 262)";

function Word({
  children,
  progress,
  from,
  to,
}: {
  children: string;
  progress: MotionValue<number>;
  from: number;
  to: number;
}) {
  const color = useTransform(progress, [from, to], [0, 100], { clamp: true });
  const mixed = useTransform(
    color,
    (v) => `color-mix(in oklab, var(--ink) ${v}%, ${GREY})`,
  );

  return (
    <motion.span className="hl-word" style={{ color: mixed }}>
      {children}
    </motion.span>
  );
}

export function HighlightHeadline({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 88%", "end 55%"],
  });

  // Flatten to tokens first so each emphasised word knows its place in line.
  const tokens = text.split(/\*([^*]+)\*/g).flatMap((part, index) =>
    index % 2 === 0
      ? [{ text: part, lit: false }]
      : part.split(/(\s+)/).map((t) => ({ text: t, lit: t.trim() !== "" })),
  );
  const total = tokens.filter((t) => t.lit).length;
  const order = tokens.map((t, i) => tokens.slice(0, i).filter((x) => x.lit).length);

  return (
    <h2
      ref={ref}
      className="text-[1.875rem] leading-[1.16] font-semibold tracking-[-0.03em] text-[oklch(80%_0.012_262)] sm:text-[2.25rem] lg:text-[2.5rem]"
    >
      {tokens.map((token, i) => {
        if (!token.lit) return token.text;
        const from = (order[i] / total) * 0.6;
        return (
          <Word key={i} progress={scrollYProgress} from={from} to={from + 0.25}>
            {token.text}
          </Word>
        );
      })}
    </h2>
  );
}
