"use client";

import { ArrowRight } from "@phosphor-icons/react";
import type { SiteContent } from "@/lib/content";
import { formatDayLong, isoDate } from "@/lib/schedule";
import { Card } from "@/components/admin/Field";

/**
 * Landing view. Four figures, then the shortcuts into the two things that get
 * edited most: course copy and dates.
 */
export function OverviewPanel({
  content,
  onGo,
}: {
  content: SiteContent;
  onGo: (id: string) => void;
}) {
  const today = isoDate(new Date());
  const upcoming = content.extraSessions.filter((session) => session.date >= today);
  const prices = content.courses.map((course) => course.price);
  const average = prices.length
    ? Math.round(prices.reduce((total, price) => total + price, 0) / prices.length)
    : 0;

  const stats = [
    { value: String(content.courses.length), label: "Courses live" },
    { value: String(content.courses.filter((course) => course.headline).length), label: "Featured" },
    { value: `€${average}`, label: "Average price" },
    { value: String(upcoming.length), label: "Dates you added" },
  ];

  const next = [...upcoming].sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius-card)] border border-border bg-surface p-5"
          >
            <p className="figure text-3xl font-semibold text-ink">{stat.value}</p>
            <p className="mt-2 text-[0.8125rem] text-ink-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Course copy"
          description="Titles, descriptions, durations, prices and what is featured on the home page."
        >
          <button
            type="button"
            onClick={() => onGo("courses")}
            className="group flex items-center gap-2 text-[0.875rem] font-medium text-accent"
          >
            Edit the courses
            <ArrowRight
              size={15}
              weight="bold"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </button>
        </Card>

        <Card
          title="Calendar"
          description={
            next
              ? `Next date you added: ${formatDayLong(next.date)} at ${next.start}.`
              : "Add one-off dates on top of the generated schedule."
          }
        >
          <button
            type="button"
            onClick={() => onGo("calendar")}
            className="group flex items-center gap-2 text-[0.875rem] font-medium text-accent"
          >
            Open the calendar
            <ArrowRight
              size={15}
              weight="bold"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </button>
        </Card>
      </div>

      <Card title="Featured on the home page" description="The three cards with a credential chip">
        <ul className="flex flex-col divide-y divide-border">
          {content.courses
            .filter((course) => course.headline)
            .map((course) => (
              <li key={course.slug} className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <span className="text-[0.875rem] font-medium text-ink">{course.title}</span>
                <span className="figure text-[0.8125rem] text-ink-muted">
                  {course.duration} · €{course.price}
                </span>
              </li>
            ))}
          {content.courses.every((course) => !course.headline) ? (
            <li className="py-3 text-[0.8125rem] text-ink-faint">
              Nothing is featured. Turn on {`"Feature this course"`} in the course editor.
            </li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
