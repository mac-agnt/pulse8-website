"use client";

import { Fragment } from "react";
import Image from "next/image";
import { Star } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { testimonials, type Testimonial } from "@/lib/data";

/**
 * Scrolling testimonial wall.
 *
 * Each column is the same list rendered twice and translated by half its own
 * height, so the loop has no seam. The second copy is hidden from assistive
 * tech and taken out of the tab order. Columns run at different speeds so the
 * wall never falls into lockstep.
 *
 * The wall wants roughly nine quotes to read as a wall. It is fed from the
 * three that the live Pulse 8 site publishes, dealt across the columns, and it
 * will fill out on its own as more are added to `testimonials`.
 */
/**
 * Three columns always. A column needs about three cards before the duplicate
 * copy that makes the loop seamless is pushed off screen, so while there are
 * fewer than nine quotes every column carries the whole set, rotated by its own
 * index. Neighbouring cards are therefore never the same quote, and the columns
 * run at different speeds so they do not fall into phase.
 *
 * Once there are nine or more, the quotes are dealt round robin instead and
 * each column becomes entirely distinct. No code change needed.
 */
const COLUMN_COUNT = 3;
const DURATIONS = [26, 32, 29];

const enoughToDeal = testimonials.length >= COLUMN_COUNT * 3;

const columns: Testimonial[][] = Array.from({ length: COLUMN_COUNT }, (_, column) =>
  enoughToDeal
    ? testimonials.filter((_item, index) => index % COLUMN_COUNT === column)
    : testimonials.map(
        (_item, index) => testimonials[(index + column) % testimonials.length],
      ),
);

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <figure className="w-full rounded-[var(--radius-card)] border border-border bg-surface p-7 transition-shadow duration-300 hover:shadow-[0_18px_40px_-18px_rgb(15_23_42/0.22)]">
      <div className="flex gap-0.5 text-accent" aria-label="Five out of five">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} size={14} weight="fill" />
        ))}
      </div>

      <blockquote className="mt-4 text-[1.0625rem] leading-relaxed text-ink">
        {item.quote}
      </blockquote>

      <figcaption className="mt-6 flex items-center gap-3 border-t border-border-soft pt-5">
        <Image
          src={item.avatar}
          alt=""
          width={160}
          height={160}
          className="size-10 rounded-full object-cover"
        />
        <span>
          <cite className="block text-[0.9375rem] font-medium not-italic text-ink">
            {item.name}
          </cite>
          <span className="block text-[0.8125rem] text-ink-faint">{item.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

function TestimonialColumn({
  items,
  duration,
  className,
}: {
  items: Testimonial[];
  duration: number;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={className}>
      <motion.ul
        animate={{ translateY: "-50%" }}
        transition={{ duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
        className="flex list-none flex-col gap-5 pb-5"
      >
        {[0, 1].map((copy) => (
          <Fragment key={copy}>
            {items.map((item) => (
              <li
                key={`${copy}-${item.name}`}
                aria-hidden={copy === 1}
                {...(copy === 1 ? { tabIndex: -1 } : {})}
              >
                <TestimonialCard item={item} />
              </li>
            ))}
          </Fragment>
        ))}
      </motion.ul>
    </div>
  );
}

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="border-t border-border-soft bg-tint/70 py-20 md:py-28"
    >
      <div className="shell">
        <Reveal>
          <h2 className="max-w-[20ch] text-3xl leading-[1.1] font-semibold sm:text-4xl lg:text-[2.75rem]">
            What people say afterwards
          </h2>
        </Reveal>

        <div
          role="region"
          aria-label="Course reviews"
          className="mt-12 flex max-h-[42rem] justify-center gap-5 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_9%,black_91%,transparent)]"
        >
          {columns.map((items, index) => (
            <TestimonialColumn
              key={index}
              items={items}
              duration={DURATIONS[index]}
              className={cn(
                "w-full max-w-sm",
                index === 1 && "hidden md:block",
                index === 2 && "hidden lg:block",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
