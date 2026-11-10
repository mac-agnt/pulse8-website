import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock } from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/layout/PageShell";
import { PageIntro } from "@/components/ui/PageIntro";
import { Reveal } from "@/components/ui/Reveal";
import { CourseBrowser, CourseCard } from "@/components/sections/Courses";
import { getCourseDetail } from "@/lib/course-details";
import { readPublicContent } from "@/lib/content.server";
import { medicationIntro } from "@/lib/data";

export const metadata: Metadata = {
  title: "Courses | Pulse 8",
  description:
    "First aid, CPR, fire safety, manual handling and workplace safety courses. Classroom, blended and online, with PHECC and CPD certification.",
};

// Card copy comes from the file the dashboard writes.
export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const { courses } = await readPublicContent();
  const medication = courses.filter((course) => course.category === "medication");

  // The old site's "E-Learning Courses" page, now a band on this one: every
  // course that can be bought and started on the e-learning portal.
  const online = courses.flatMap((course) => {
    const url = getCourseDetail(course.slug)?.buyOnlineUrl;
    return url ? [{ course, url }] : [];
  });

  return (
    <PageShell className="pb-0 md:pb-0">
      <PageIntro label="Courses" title="Every course we run">
        Explore in-person, blended and online training. Select a course for more details
        and upcoming dates, or ask us about training at your premises.
      </PageIntro>

      <div className="shell">
        <CourseBrowser courses={courses} limit={null} />
      </div>

      {/* Stable anchor for the Medication menu group. Category, not a format filter. */}
      {medication.length > 0 ? (
        <section
          id="medication"
          aria-labelledby="medication-heading"
          className="shell mt-20 scroll-mt-[calc(7rem+var(--header-offset))] md:mt-28"
        >
          <Reveal>
            <h2
              id="medication-heading"
              className="text-3xl leading-[1.1] font-semibold sm:text-4xl"
            >
              Medication
            </h2>
            <p className="mt-5 max-w-[58ch] text-lg text-ink-muted">{medicationIntro}</p>
          </Reveal>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {medication.map((course) => (
              <li key={course.slug}>
                <CourseCard course={course} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {online.length > 0 ? (
        <section
          id="online"
          aria-labelledby="online-heading"
          className="mt-20 border-t border-border-soft bg-tint/70 py-20 md:mt-28 md:py-28"
        >
          <div className="shell grid gap-10 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-4">
              <h2
                id="online-heading"
                className="max-w-[16ch] text-3xl leading-[1.1] font-semibold sm:text-4xl"
              >
                Start online today
              </h2>
              <p className="mt-5 max-w-[38ch] text-lg text-ink-muted">
                These courses are bought and taken on the Pulse 8 e-learning portal, at your
                own pace. Some add a practical session afterwards; the course page says
                which.
              </p>
            </Reveal>

            <Reveal delay={0.06} className="lg:col-span-8">
              <ul className="grid gap-3 sm:grid-cols-2">
                {online.map(({ course, url }) => (
                  <li
                    key={course.slug}
                    className="flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5"
                  >
                    <Link
                      href={`/courses/${course.slug}`}
                      className="text-[1.0625rem] leading-snug font-semibold text-ink hover:underline hover:decoration-border hover:underline-offset-4"
                    >
                      {course.title}
                    </Link>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-faint">
                      <Clock size={14} weight="bold" />
                      {course.duration ? (
                        <>
                          <span className="figure">{course.duration}</span>
                          <span aria-hidden="true">,</span>
                        </>
                      ) : null}
                      <span>{course.delivery.toLowerCase()}</span>
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener"
                      className="group mt-5 inline-flex items-center gap-1.5 self-start text-[0.9375rem] font-medium text-ink"
                    >
                      Buy online
                      <ArrowUpRight
                        size={15}
                        weight="bold"
                        className="text-accent transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                      />
                      <span className="sr-only">(opens the e-learning portal in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
