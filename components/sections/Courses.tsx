"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock, UsersThree } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { courses as defaultCourses, deliveryFilters, type Course, type Delivery } from "@/lib/data";
import { formatPrice } from "@/lib/schedule";
import { duration as dur, ease, viewport } from "@/lib/motion";

const INITIAL_COUNT = 9;

/**
 * Course card.
 *
 * The photograph runs to the top edge and is dissolved into the card body by a
 * gradient in the card's own colour, so there is no seam between image and
 * text. Everything the light card carried is still here: duration, class size,
 * delivery, certificate, price and the link through to dates.
 */
function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/book?course=${course.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-navy-deep transition-transform duration-300 ease-out hover:-translate-y-0.5"
    >
      <div className="relative -mt-px h-56 shrink-0 overflow-hidden">
        <Image
          src={course.image}
          alt=""
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-navy-deep to-transparent"
        />
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg leading-snug font-semibold text-on-navy">
            {course.title}
          </h3>
          <ArrowUpRight
            size={18}
            weight="bold"
            className="mt-1 shrink-0 text-white/45 transition-colors duration-200 group-hover:text-white"
          />
        </div>

        <p className="mt-2.5 border-b border-white/10 pb-5 text-[0.9375rem] leading-relaxed text-on-navy-muted">
          {course.blurb}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8125rem] text-white/55">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={15} weight="bold" />
            <span className="figure">{course.duration}</span>
          </span>
          {course.maxParticipants ? (
            <span className="inline-flex items-center gap-1.5">
              <UsersThree size={15} weight="bold" />
              <span className="figure">Max {course.maxParticipants}</span>
            </span>
          ) : null}
          <span className="ml-auto rounded-full border border-white/15 bg-white/10 px-2.5 py-1 font-medium text-on-navy-muted">
            {course.delivery}
          </span>
        </div>

        {course.certificate ? (
          <p className="mt-3 text-[0.8125rem] text-white/55">
            Certificate:{" "}
            <span className="font-medium text-on-navy">{course.certificate}</span>
          </p>
        ) : null}

        <div className="mt-auto flex items-baseline gap-2 border-t border-white/10 pt-4">
          <span className="figure text-xl font-semibold text-on-navy">
            {formatPrice(course.price)}
          </span>
          <span className="text-[0.8125rem] text-white/55">per person</span>
          <span className="ml-auto text-[0.875rem] font-medium text-on-navy">
            See dates
          </span>
        </div>
      </div>
    </Link>
  );
}

export function Courses({ courses = defaultCourses }: { courses?: Course[] }) {
  const [filter, setFilter] = useState<"All" | Delivery>("All");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(
    () => (filter === "All" ? courses : courses.filter((c) => c.delivery === filter)),
    [courses, filter],
  );

  const visible = expanded ? filtered : filtered.slice(0, INITIAL_COUNT);
  const hidden = filtered.length - visible.length;

  return (
    <section id="courses" className="border-t border-border-soft bg-tint/70 py-20 md:py-28">
      <div className="shell">
        <p className="text-[0.8125rem] font-medium tracking-[0.14em] text-accent uppercase">
          Courses
        </p>
        <h2 className="mt-4 max-w-[20ch] text-3xl leading-[1.1] font-semibold sm:text-4xl lg:text-[2.75rem]">
          Eighteen courses, one provider
        </h2>
        <p className="mt-5 max-w-[58ch] text-lg text-ink-muted">
          Classroom, blended and fully online, priced per person. Open any course to see its
          next dates, or ask us to run it at your premises.
        </p>

        <div
          role="tablist"
          aria-label="Filter courses by delivery"
          className="mt-9 flex flex-wrap gap-2"
        >
          {deliveryFilters.map((option) => {
            const active = option === filter;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setFilter(option);
                  setExpanded(false);
                }}
                className={cn(
                  "h-10 rounded-[var(--radius-control)] border px-4 text-[0.9375rem] font-medium transition-colors duration-200",
                  active
                    ? "border-accent bg-accent text-on-accent"
                    : "border-border bg-surface text-ink-muted hover:border-ink-faint hover:text-ink",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>

        <motion.ul
          layout
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((course, index) => (
              <motion.li
                key={course.slug}
                layout
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                viewport={viewport}
                transition={{
                  duration: dur.base,
                  ease,
                  delay: Math.min(index, 5) * 0.04,
                }}
              >
                <CourseCard course={course} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>

        {hidden > 0 ? (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex h-11 items-center rounded-[var(--radius-control)] border border-border bg-surface px-6 text-[0.9375rem] font-medium text-ink transition-colors duration-200 hover:border-ink-faint hover:bg-tint"
            >
              Show {hidden} more {hidden === 1 ? "course" : "courses"}
            </button>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <p className="mt-10 rounded-[var(--radius-card)] border border-dashed border-border px-6 py-10 text-center text-ink-muted">
            No courses in this format yet. Ask us and we will tell you what is coming.
          </p>
        ) : null}
      </div>
    </section>
  );
}
