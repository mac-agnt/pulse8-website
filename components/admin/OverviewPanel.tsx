"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarBlank, CurrencyEur, GraduationCap } from "@phosphor-icons/react";
import type { ExtraSession } from "@/lib/content";
import { isoDate } from "@/lib/schedule";
import { Card } from "@/components/admin/Field";
import { Notice } from "@/components/admin/ui";
import { adminApi } from "@/components/admin/api";

type Dates = { dates: Array<ExtraSession & { booked: number }>; courses: Array<{ slug: string; title: string }> };
type Prices = {
  classroom: Array<{ slug: string; title: string; draft: boolean; price: number | null }>;
  delivery: { confirmed: boolean };
};

const longDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** Landing view: the next dates, what needs attention, and the way into each job. */
export function OverviewPanel({ name, onGo }: { name: string; onGo: (id: string) => void }) {
  const [dates, setDates] = useState<Dates | null>(null);
  const [prices, setPrices] = useState<Prices | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([adminApi<Dates>("/api/admin/dates"), adminApi<Prices>("/api/admin/prices")]).then(
      ([d, p]) => {
        setDates(d);
        setPrices(p);
      },
      (cause: Error) => setError(cause.message),
    );
  }, []);

  const today = isoDate(new Date());
  const upcoming = (dates?.dates ?? [])
    .filter((date) => !date.closed && date.date >= today)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const titles = new Map(dates?.courses.map((course) => [course.slug, course.title]));
  const live = prices?.classroom.filter((course) => !course.draft) ?? [];
  const enquire = live.filter((course) => course.price === null);
  const booked = upcoming.reduce((sum, date) => sum + date.booked, 0);

  const stats = [
    { value: dates ? String(upcoming.length) : "…", label: "Upcoming dates" },
    { value: dates ? String(booked) : "…", label: "Places booked on them" },
    { value: prices ? String(live.length - enquire.length) : "…", label: "Courses bookable online" },
    { value: prices ? String(enquire.length) : "…", label: "Courses on Enquire" },
  ];

  const todo = [
    ...(prices && !prices.delivery.confirmed ? [{ text: "Shop delivery rates aren't set yet (orders show free delivery).", go: "prices" }] : []),
    ...(prices && enquire.length ? [{ text: `${enquire.length} ${enquire.length === 1 ? "course has" : "courses have"} no price, so ${enquire.length === 1 ? "it shows" : "they show"} “Enquire”.`, go: "prices" }] : []),
    ...(dates && upcoming.length === 0 ? [{ text: "No upcoming dates of your own on the booking page.", go: "dates" }] : []),
  ];

  const jobs = [
    { id: "prices", icon: CurrencyEur, title: "Prices", text: "Course prices, shop prices, delivery and the VAT line." },
    { id: "dates", icon: CalendarBlank, title: "Course dates", text: "Add, change or close dates. Live on the booking page at once." },
    { id: "courses", icon: GraduationCap, title: "Course descriptions", text: "Titles, descriptions, durations and photos." },
  ];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[0.9375rem] text-ink">Hello {name.split(" ")[0]}.</p>
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
            <p className="figure text-3xl font-semibold text-ink">{stat.value}</p>
            <p className="mt-2 text-[0.8125rem] text-ink-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {todo.length ? (
        <Card title="To check">
          <ul className="flex flex-col gap-2">
            {todo.map((item) => (
              <li key={item.text}>
                <button type="button" onClick={() => onGo(item.go)} className="group flex items-start gap-2 text-left text-[0.875rem] text-ink hover:text-accent">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  {item.text}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {jobs.map((job) => (
          <button
            key={job.id}
            type="button"
            onClick={() => onGo(job.id)}
            className="group flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-5 text-left transition-colors hover:border-ink-faint"
          >
            <job.icon size={20} className="text-accent" />
            <span className="text-[0.9375rem] font-semibold text-ink">{job.title}</span>
            <span className="text-[0.8125rem] text-ink-muted">{job.text}</span>
            <span className="mt-1 flex items-center gap-1.5 text-[0.8125rem] font-medium text-accent">
              Open
              <ArrowRight size={14} weight="bold" className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>

      <Card title="Next dates on the booking page">
        {upcoming.length === 0 ? (
          <p className="text-[0.875rem] text-ink-faint">{dates ? "None yet." : "Loading…"}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {upcoming.slice(0, 6).map((date) => (
              <li key={date.id} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block truncate text-[0.875rem] font-medium text-ink">{titles.get(date.courseSlug) ?? date.courseSlug}</span>
                  <span className="text-[0.75rem] text-ink-faint">
                    {longDay(date.date)} · {date.start}
                  </span>
                </span>
                <span className="figure shrink-0 text-[0.8125rem] text-ink-muted">
                  {date.booked} of {date.seatsLeft} booked
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
