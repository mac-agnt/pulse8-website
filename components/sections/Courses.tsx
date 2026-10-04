"use client";

import { useMemo, useState, type SyntheticEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowsClockwise,
  ArrowUpRight,
  Certificate,
  Clock,
  MonitorPlay,
  UsersThree,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { courses as defaultCourses, deliveryFilters, type Course, type Delivery } from "@/lib/data";
import { formatPrice } from "@/lib/schedule";
import { duration as dur, ease, viewport } from "@/lib/motion";

const INITIAL_COUNT = 9;

/**
 * Course card, two faces.
 *
 * The front is the photograph dissolved into the card body, the title, the
 * price and a plain "View course" button. Pressing anywhere else on the card
 * turns it over to the detail face (duration, class size, delivery, certificate,
 * the full blurb) with the same way through to the course page. Both faces sit
 * in one grid cell so the card is as tall as the taller of the two, and the
 * face that is turned away is inert so it can never take focus or a click.
 *
 * The photograph is overdrawn by the gradient (1px past its own edge, no
 * hover scale) so there is no hairline between image and body on any render.
 * Pieces of the detail face are lifted off it on Z for depth; the faces
 * therefore must not clip their children. Reduced motion turns instantly.
 */
export function CourseCard({ course }: { course: Course }) {
  const [flipped, setFlipped] = useState(false);

  // "PHECC" reads as a body, "Certificate of attendance" is already a name, and
  // "CPD, 5 units" keeps its qualifier after the noun: "CPD certificate, 5 units".
  const certificateLabel = (() => {
    const value = course.certificate ?? "";
    if (/certificate/i.test(value)) return value;
    const [body, ...rest] = value.split(",");
    return `${body} certificate${rest.length ? `,${rest.join(",")}` : ""}`;
  })();

  const toggle = () => setFlipped((value) => !value);
  const stop = (event: SyntheticEvent) => event.stopPropagation();

  const details = [
    { icon: Clock, label: "Duration", value: course.duration },
    course.maxParticipants
      ? { icon: UsersThree, label: "Class size", value: `Max ${course.maxParticipants}` }
      : null,
    { icon: MonitorPlay, label: "Delivery", value: course.delivery },
    course.certificate
      ? { icon: Certificate, label: "Certificate", value: course.certificate }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="h-full [perspective:2000px]">
      <div
        className={cn(
          "grid h-full transition-transform duration-[800ms] ease-[cubic-bezier(0.65,0,0.35,1)] will-change-transform [transform-style:preserve-3d] motion-reduce:transition-none",
          flipped && "[transform:rotateY(180deg)]",
        )}
      >
        {/* Front */}
        <div
          role="button"
          tabIndex={flipped ? -1 : 0}
          inert={flipped}
          aria-expanded={flipped}
          aria-label={`${course.title}, show details`}
          onClick={toggle}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggle();
            }
          }}
          className="group/card col-start-1 row-start-1 cursor-pointer rounded-[var(--radius-card)] border border-border bg-surface p-3 transition-colors duration-300 [transform-style:preserve-3d] [backface-visibility:hidden] hover:border-ink-faint"
        >
          <div className="flex h-full flex-col [transform-style:preserve-3d]">
            {/* Photograph, lifted off the card */}
            <div className="relative h-56 shrink-0 [transform-style:preserve-3d] [transform:translateZ(50px)]">
              <div className="absolute inset-0 overflow-hidden rounded-xl bg-tint">
                <Image
                  src={course.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                  className="object-cover object-center"
                />
              </div>

              <div className="absolute bottom-3 left-3 flex items-center gap-2 [transform:translateZ(40px)]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[0.75rem] font-medium text-ink shadow-sm">
                  <Clock size={13} weight="bold" className="text-accent" />
                  <span className="figure">{course.duration}</span>
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1.5 text-[0.75rem] font-medium text-ink shadow-sm">
                  {course.delivery}
                </span>
              </div>

              <span
                aria-hidden="true"
                className="absolute top-3 right-3 grid size-9 place-items-center rounded-full border border-border bg-surface text-ink shadow-sm transition-transform duration-500 ease-out [transform:translateZ(40px)] group-hover/card:rotate-180 motion-reduce:transition-none"
              >
                <ArrowsClockwise size={16} weight="bold" />
              </span>
            </div>

            {/* Copy */}
            <div className="flex flex-1 flex-col px-2 pt-5 pb-1 [transform-style:preserve-3d]">
              <div className="[transform:translateZ(30px)]">
                {course.certificate ? (
                  <p className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-muted">
                    <Certificate size={15} weight="bold" className="text-accent" />
                    {certificateLabel}
                  </p>
                ) : null}
                <h3 className="mt-2 text-xl leading-snug font-semibold tracking-[-0.02em] text-ink">
                  {course.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-[0.9375rem] leading-relaxed text-ink-muted">
                  {course.blurb}
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-border-soft pt-4 [transform:translateZ(40px)]">
                <div className="flex flex-col">
                  <span className="figure text-xl leading-none font-semibold text-ink">
                    {formatPrice(course.price)}
                  </span>
                  <span className="mt-1 text-[0.75rem] whitespace-nowrap text-ink-faint">
                    per person
                  </span>
                </div>
                <Link
                  href={`/courses/${course.slug}`}
                  onClick={stop}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-accent px-5 text-[0.875rem] font-medium whitespace-nowrap text-on-accent transition-colors duration-200 hover:bg-accent-strong"
                >
                  View course
                  <ArrowUpRight size={15} weight="bold" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          inert={!flipped}
          className="col-start-1 row-start-1 flex flex-col rounded-[var(--radius-card)] border border-white/10 bg-navy-deep p-7 [transform-style:preserve-3d] [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <h3 className="text-lg leading-snug font-semibold text-on-navy [transform:translateZ(20px)]">
            {course.title}
          </h3>
          <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-on-navy-muted [transform:translateZ(15px)]">
            {course.blurb}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3 [transform-style:preserve-3d]">
            {details.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                style={{ transform: `translateZ(30px)` }}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4 [transform-style:preserve-3d]"
              >
                <span className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-white [transform:translateZ(20px)]">
                  <Icon size={18} weight="bold" />
                </span>
                <div className="[transform:translateZ(10px)]">
                  <dt className="text-[0.75rem] text-white/55">{label}</dt>
                  <dd className="mt-0.5 text-[0.9375rem] font-medium text-on-navy">{value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-auto flex items-center gap-3 pt-6 [transform:translateZ(40px)]">
            <Link
              href={`/courses/${course.slug}`}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-accent px-5 text-[0.9375rem] font-medium text-on-accent transition-colors duration-200 hover:bg-accent-strong"
            >
              View course
              <ArrowUpRight size={16} weight="bold" />
            </Link>
            <button
              type="button"
              onClick={toggle}
              className="inline-flex h-11 items-center rounded-full border border-white/20 px-5 text-[0.9375rem] font-medium text-on-navy transition-colors duration-200 hover:bg-white/10"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Delivery filter and card grid. The home page shows the first nine with a way
 * to reveal the rest; the courses page passes `limit={null}` to show all.
 */
export function CourseBrowser({
  courses = defaultCourses,
  limit = INITIAL_COUNT,
}: {
  courses?: Course[];
  limit?: number | null;
}) {
  const [filter, setFilter] = useState<"All" | Delivery>("All");
  const [expanded, setExpanded] = useState(limit === null);

  const filtered = useMemo(
    () => (filter === "All" ? courses : courses.filter((c) => c.delivery === filter)),
    [courses, filter],
  );

  const visible = expanded || limit === null ? filtered : filtered.slice(0, limit);
  const hidden = filtered.length - visible.length;

  return (
    <>
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
    </>
  );
}

export function Courses({ courses = defaultCourses }: { courses?: Course[] }) {
  return (
    <section id="courses" className="border-t border-border-soft bg-tint/70 py-20 md:py-28">
      <div className="shell">
        <p className="text-[0.8125rem] font-medium tracking-[0.14em] text-ink-muted uppercase">
          Courses
        </p>
        <h2 className="mt-4 max-w-[20ch] text-3xl leading-[1.1] font-semibold sm:text-4xl lg:text-[2.75rem]">
          Nineteen courses, one provider
        </h2>
        <p className="mt-5 max-w-[58ch] text-lg text-ink-muted">
          Classroom, blended and fully online, priced per person. Open any course for the
          full syllabus and its next dates, or ask us to run it at your premises.
        </p>

        <CourseBrowser courses={courses} />
      </div>
    </section>
  );
}
