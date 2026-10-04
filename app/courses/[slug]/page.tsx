import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarBlank,
  Certificate,
  Check,
  Clock,
  MapPin,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { getCourseDetail, type DetailSection } from "@/lib/course-details";
import { familyFor } from "@/lib/course-families";
import { readContent } from "@/lib/content.server";
import type { Course } from "@/lib/content";
import {
  buildSchedule,
  expandExtraSessions,
  formatDayShort,
  formatPrice,
  isoDate,
  mergeSessions,
} from "@/lib/schedule";
import { cn } from "@/lib/cn";

// Prices and card copy come from the file the dashboard writes.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function findCourse(slug: string): Promise<{ course: Course; all: Course[] } | null> {
  const { courses } = await readContent();
  const course = courses.find((item) => item.slug === slug);
  return course ? { course, all: courses } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await findCourse(slug);
  if (!found) return {};
  return {
    title: `${found.course.title} | Pulse 8`,
    description: found.course.blurb,
  };
}

/**
 * One block of the syllabus. A list becomes a grid of tick tiles, which scans
 * far faster than a column of bullets; prose stays prose.
 */
function SectionBlock({ section }: { section: DetailSection }) {
  const items = section.items ?? [];

  return (
    <section>
      <h2 className="text-2xl leading-snug font-semibold tracking-[-0.025em] text-ink md:text-[1.75rem]">
        {section.heading}
      </h2>

      {section.body?.map((paragraph) => (
        <p key={paragraph} className="mt-4 max-w-[64ch] text-[1.0625rem] leading-relaxed text-ink-muted">
          {paragraph}
        </p>
      ))}

      {items.length > 0 ? (
        <ul className={cn("mt-6 grid gap-2.5", items.length > 3 && "sm:grid-cols-2")}>
          {items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-xl border border-border-soft bg-surface px-4 py-3.5 leading-snug text-ink"
            >
              <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <Check size={12} weight="bold" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * Related course. Deliberately not the flip card from the home page: this one
 * is for reading and acting. A short photograph, the name large, one plain
 * line of facts, the price, and two ways forward, a full-width button to the
 * course and a link straight to its dates.
 */
function RelatedCourse({ course }: { course: Course }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      <Link
        href={`/courses/${course.slug}`}
        className="relative block h-44 shrink-0 overflow-hidden bg-tint"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src={course.image}
          alt=""
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          className="object-cover"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl leading-snug font-semibold tracking-[-0.02em] text-ink">
          <Link href={`/courses/${course.slug}`} className="hover:underline hover:decoration-border hover:underline-offset-4">
            {course.title}
          </Link>
        </h3>
        <p className="mt-2 text-[0.9375rem] font-medium text-ink-muted">
          <span className="figure">{course.duration}</span>
          <span aria-hidden="true"> / </span>
          {course.delivery}
          {course.certificate ? (
            <>
              <span aria-hidden="true"> / </span>
              {course.certificate}
            </>
          ) : null}
        </p>
        <p className="mt-3 line-clamp-2 text-[0.9375rem] leading-relaxed text-ink-muted">
          {course.blurb}
        </p>

        <div className="mt-auto pt-5">
          <p className="flex items-baseline gap-2">
            <span className="figure text-2xl font-semibold text-ink">{formatPrice(course.price)}</span>
            <span className="text-[0.8125rem] text-ink-faint">per person</span>
          </p>
          <Button href={`/courses/${course.slug}`} size="lg" className="mt-3 w-full">
            View course
            <ArrowRight size={16} weight="bold" />
          </Button>
          <Link
            href={`/book?course=${course.slug}`}
            className="mt-3 inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-ink underline decoration-border underline-offset-4 transition-colors duration-200 hover:decoration-accent"
          >
            See dates
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const found = await findCourse(slug);
  if (!found) notFound();

  const { course, all } = found;
  const detail = getCourseDetail(course.slug);
  const family = familyFor(course.slug);

  // Same family first, then anything else, so there are always three.
  const related = [
    ...all.filter((c) => c.slug !== course.slug && familyFor(c.slug).key === family.key),
    ...all.filter((c) => c.slug !== course.slug && familyFor(c.slug).key !== family.key),
  ].slice(0, 3);

  // The next few dates for this course, from the same schedule the booking page uses.
  const now = new Date();
  const todayIso = isoDate(now);
  const { extraSessions, courses: allCourses } = await readContent();
  const upcoming = mergeSessions(buildSchedule(now), expandExtraSessions(extraSessions, allCourses))
    .filter((session) => session.courseSlug === course.slug && session.date >= todayIso)
    .slice(0, 3);

  const chips = [
    { icon: Clock, value: course.duration },
    { icon: MapPin, value: course.delivery },
    course.maxParticipants
      ? { icon: UsersThree, value: `Up to ${course.maxParticipants} learners` }
      : null,
    course.certificate ? { icon: Certificate, value: course.certificate } : null,
  ].filter((chip) => chip !== null);

  const facts = [
    { icon: Clock, label: "Duration", value: course.duration },
    course.maxParticipants
      ? { icon: UsersThree, label: "Class size", value: `Up to ${course.maxParticipants}` }
      : null,
    { icon: MapPin, label: "Delivery", value: course.delivery },
    course.certificate
      ? { icon: Certificate, label: "Certificate", value: course.certificate }
      : null,
    detail?.validity
      ? { icon: CalendarBlank, label: "Valid for", value: detail.validity }
      : null,
  ].filter((fact) => fact !== null);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.blurb,
    provider: { "@type": "Organization", name: "Pulse 8", sameAs: "https://pulse8.ie" },
  };

  return (
    <PageShell className="!pt-0 !pb-0 md:!pt-0 md:!pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Hero band */}
      <section className="relative isolate overflow-hidden bg-navy-deep pt-[calc(7.5rem+var(--header-offset))] pb-28 text-on-navy md:pt-[calc(9rem+var(--header-offset))] md:pb-40">
        <Image
          src={course.image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
        {/* Navy wash, heavier on the copy side, so the type holds contrast on any photograph. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-deep/95 via-navy-deep/80 to-navy-deep/45"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-navy-deep/70 to-transparent"
        />
        <div className="shell">
          <div className="max-w-[44rem]">
            <Link
              href="/courses"
              className="group flex w-fit items-center gap-2 text-[0.9375rem] text-on-navy-muted transition-colors duration-200 hover:text-white"
            >
              <ArrowLeft
                size={15}
                weight="bold"
                className="transition-transform duration-200 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none"
              />
              All courses
            </Link>

            <p className="mt-8 flex w-fit items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[0.8125rem] font-medium text-white/85">
              <span
                aria-hidden="true"
                style={{ backgroundColor: `var(${family.token})` }}
                className="size-2 rounded-full"
              />
              {family.label}
            </p>

            <h1 className="mt-5 max-w-[18ch] text-[2.5rem] leading-[1.03] font-semibold tracking-[-0.035em] text-white sm:text-[3.25rem] lg:text-[4rem]">
              {course.title}
            </h1>
            <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-on-navy-muted">
              {course.blurb}
            </p>

            <ul className="mt-7 flex flex-wrap gap-2.5">
              {chips.map(({ icon: Icon, value }) => (
                <li
                  key={value}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-2 text-[0.875rem] font-medium text-white"
                >
                  <Icon size={16} weight="bold" className="text-white/60" />
                  <span className="figure">{value}</span>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href={`/book?course=${course.slug}`} size="lg" className="rounded-full">
                <CalendarBlank size={17} weight="bold" />
                See dates
              </Button>
              {detail?.buyOnlineUrl ? (
                <Button
                  href={detail.buyOnlineUrl}
                  variant="onDark"
                  size="lg"
                  className="rounded-full"
                  target="_blank"
                  rel="noopener"
                >
                  Buy online
                  <ArrowUpRight size={16} weight="bold" />
                  <span className="sr-only">(opens the e-learning portal in a new tab)</span>
                </Button>
              ) : null}
            </div>
          </div>

        </div>
      </section>

      {/* Body, rising over the band */}
      <div className="shell relative z-10 -mt-16 grid gap-10 md:-mt-24 lg:grid-cols-12 lg:gap-x-12">
        <div className="flex flex-col gap-14 rounded-[1.75rem] border border-border bg-bg p-6 shadow-[0_30px_80px_-40px_rgb(15_23_42/0.3)] md:p-10 lg:col-span-8 xl:col-span-8">
          {detail?.intro.length ? (
            <div className="flex flex-col gap-4">
              {detail.intro.map((paragraph, index) => (
                <p
                  key={paragraph}
                  className={cn(
                    "max-w-[64ch] leading-relaxed",
                    index === 0 ? "text-xl text-ink md:text-[1.375rem]" : "text-lg text-ink-muted",
                  )}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <p className="max-w-[64ch] text-xl leading-relaxed text-ink">{course.blurb}</p>
          )}

          {detail?.sections.map((section) => (
            <SectionBlock key={section.heading} section={section} />
          ))}
        </div>

        {/* Booking card */}
        <aside
          aria-label="Book this course"
          className="lg:sticky lg:top-[calc(6.5rem+var(--header-offset))] lg:col-span-4 lg:self-start"
        >
          <div className="rounded-[1.75rem] border border-border bg-surface p-6 shadow-[0_30px_80px_-40px_rgb(15_23_42/0.3)] md:p-7">
            <p className="flex items-baseline gap-2">
              <span className="figure text-[2.5rem] leading-none font-semibold tracking-[-0.04em] text-ink">
                {formatPrice(course.price)}
              </span>
              <span className="text-[0.9375rem] text-ink-muted">per person</span>
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-2.5 border-t border-border-soft pt-6">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-tint/70 p-3.5">
                  <dt className="flex items-center gap-1.5 text-[0.75rem] text-ink-muted">
                    <Icon size={14} weight="bold" />
                    {label}
                  </dt>
                  <dd className="figure mt-1.5 text-[0.9375rem] leading-snug font-medium text-ink">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {upcoming.length > 0 ? (
              <div className="mt-6 border-t border-border-soft pt-6">
                <h2 className="text-[0.75rem] font-medium tracking-[0.1em] text-ink-faint uppercase">
                  Next dates
                </h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {upcoming.map((session) => {
                    const full = session.seatsLeft === 0;
                    const low = !full && session.seatsLeft <= 3;
                    return (
                      <li key={session.id}>
                        <Link
                          href={`/book?course=${course.slug}`}
                          className="group flex items-center justify-between gap-3 rounded-xl border border-border-soft px-3.5 py-3 transition-colors duration-200 hover:border-ink-faint hover:bg-tint/60"
                        >
                          <span>
                            <span className="figure block text-[0.9375rem] font-semibold text-ink">
                              {formatDayShort(session.date)}
                            </span>
                            <span className="figure block text-[0.8125rem] text-ink-muted">
                              {session.start}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "text-[0.8125rem] font-medium",
                              full ? "text-ink-faint" : low ? "text-accent-strong" : "text-ink-muted",
                            )}
                          >
                            {full
                              ? "Full"
                              : low
                                ? `${session.seatsLeft} ${session.seatsLeft === 1 ? "place" : "places"} left`
                                : `${session.seatsLeft} places`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3">
              <Button href={`/book?course=${course.slug}`} size="lg" className="w-full rounded-full">
                <CalendarBlank size={17} weight="bold" />
                See dates and book
              </Button>
              {detail?.buyOnlineUrl ? (
                <Button
                  href={detail.buyOnlineUrl}
                  variant="secondary"
                  size="lg"
                  className="w-full rounded-full"
                  target="_blank"
                  rel="noopener"
                >
                  Buy online
                  <ArrowUpRight size={16} weight="bold" />
                  <span className="sr-only">(opens the e-learning portal in a new tab)</span>
                </Button>
              ) : null}
            </div>

            <Link
              href={`/contact?course=${course.slug}`}
              className="group mt-5 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink"
            >
              Run it at your premises
              <ArrowRight
                size={15}
                weight="bold"
                className="text-accent transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="shell mt-24 md:mt-32">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2
              id="related-heading"
              className="text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl"
            >
              Related courses
            </h2>
            <Link
              href="/courses"
              className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink"
            >
              View all courses
              <ArrowRight
                size={15}
                weight="bold"
                className="text-accent transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          </div>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <li key={item.slug}>
                <RelatedCourse course={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Closing call to action */}
      <section className="shell mt-20 pb-20 md:mt-28 md:pb-28">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[1.75rem] bg-navy-deep p-8 text-on-navy md:flex-row md:items-center md:p-12">
          <div>
            <h2 className="max-w-[22ch] text-2xl leading-tight font-semibold tracking-[-0.025em] text-white sm:text-3xl">
              Training a whole team? We come to you.
            </h2>
            <p className="mt-3 max-w-[48ch] text-on-navy-muted">
              Tell us your numbers and your dates and we will run {course.title} at your
              premises, anywhere in Ireland.
            </p>
          </div>
          <Button href={`/contact?course=${course.slug}`} size="lg" className="shrink-0 rounded-full">
            Get a quote
            <ArrowRight size={16} weight="bold" />
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
