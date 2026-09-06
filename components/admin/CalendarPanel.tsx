"use client";

import { useMemo, useState } from "react";
import { CaretLeft, CaretRight, Plus, Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { Course, ExtraSession } from "@/lib/content";
import {
  addMonths,
  formatDayLong,
  formatMonth,
  isoDate,
  monthGrid,
} from "@/lib/schedule";
import { Card, Field, Select, TextInput, Toggle } from "@/components/admin/Field";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Extra dates.
 *
 * The public calendar is generated from the course list. Anything added here is
 * merged into it, which is how a one-off evening class or an on-site booking
 * gets onto the site without touching code.
 */
export function CalendarPanel({
  courses,
  sessions,
  onChange,
}: {
  courses: Course[];
  sessions: ExtraSession[];
  onChange: (next: ExtraSession[]) => void;
}) {
  const today = isoDate(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [draft, setDraft] = useState<Omit<ExtraSession, "id">>({
    courseSlug: courses[0]?.slug ?? "",
    date: today,
    start: "09:30",
    days: 1,
    seatsLeft: 8,
    online: false,
    note: "",
  });

  const days = useMemo(() => monthGrid(month), [month]);
  const byDate = useMemo(() => {
    const map = new Map<string, ExtraSession[]>();
    sessions.forEach((session) => {
      map.set(session.date, [...(map.get(session.date) ?? []), session]);
    });
    return map;
  }, [sessions]);

  const upcoming = useMemo(
    () =>
      [...sessions].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
    [sessions],
  );

  const titleFor = (slug: string) =>
    courses.find((course) => course.slug === slug)?.title ?? "Removed course";

  const addSession = () => {
    if (!draft.courseSlug || !draft.date) return;
    onChange([
      ...sessions,
      {
        ...draft,
        note: draft.note?.trim() ? draft.note.trim() : undefined,
        id: `extra-${draft.courseSlug}-${draft.date}-${draft.start}-${sessions.length}`,
      },
    ]);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <Card
        title={formatMonth(month)}
        description="Dates you have added show a marker. Pick a day to set it on the form."
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonth(addMonths(month, -1))}
              className="grid size-8 place-items-center rounded-[8px] border border-border text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonth(addMonths(month, 1))}
              className="grid size-8 place-items-center rounded-[8px] border border-border text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <span
              key={day}
              className="pb-2 text-center text-[0.6875rem] font-semibold tracking-wider text-ink-faint uppercase"
            >
              {day.slice(0, 2)}
            </span>
          ))}

          {days.map((day) => {
            const inMonth = day.startsWith(month);
            const added = byDate.get(day)?.length ?? 0;
            const isSelected = draft.date === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setDraft({ ...draft, date: day })}
                className={cn(
                  "flex h-12 flex-col items-center justify-center gap-1 rounded-[8px] border text-[0.8125rem] transition-colors md:h-14",
                  isSelected
                    ? "border-accent bg-accent-soft text-accent-strong"
                    : "border-transparent hover:border-border hover:bg-tint/70",
                  inMonth ? "text-ink" : "text-ink-faint",
                  day === today && !isSelected && "border-border font-semibold",
                )}
              >
                <span className="figure">{Number(day.slice(-2))}</span>
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    added ? "bg-accent" : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-col gap-5">
        <Card title="Add a date" description="It appears on /book once you save">
          <div className="flex flex-col gap-4">
            <Field label="Course">
              <Select
                value={draft.courseSlug}
                onChange={(event) => setDraft({ ...draft, courseSlug: event.target.value })}
              >
                {courses.map((course) => (
                  <option key={course.slug} value={course.slug}>
                    {course.title}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">
                <TextInput
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                />
              </Field>
              <Field label="Start time">
                <TextInput
                  type="time"
                  value={draft.start}
                  onChange={(event) => setDraft({ ...draft, start: event.target.value })}
                />
              </Field>
              <Field label="Days">
                <TextInput
                  type="number"
                  min={1}
                  value={draft.days}
                  onChange={(event) =>
                    setDraft({ ...draft, days: Math.max(1, Number(event.target.value) || 1) })
                  }
                />
              </Field>
              <Field label="Seats">
                <TextInput
                  type="number"
                  min={0}
                  value={draft.seatsLeft}
                  onChange={(event) =>
                    setDraft({ ...draft, seatsLeft: Math.max(0, Number(event.target.value) || 0) })
                  }
                />
              </Field>
            </div>

            <Field label="Note" hint="Internal only, not shown on the site">
              <TextInput
                value={draft.note ?? ""}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                placeholder="On site at the client"
              />
            </Field>

            <Toggle
              checked={draft.online}
              onChange={(next) => setDraft({ ...draft, online: next })}
              label="Runs live online"
            />

            <button
              type="button"
              onClick={addSession}
              className="mt-1 flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 py-2.5 text-[0.875rem] font-medium text-on-accent transition-colors hover:bg-accent-strong"
            >
              <Plus size={15} weight="bold" />
              Add to the calendar
            </button>
          </div>
        </Card>

        <Card title={`Added dates (${sessions.length})`}>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-[0.8125rem] text-ink-faint">
              Nothing added yet. The site still shows the generated schedule.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto">
              {upcoming.map((session) => (
                <li key={session.id} className="flex items-start gap-3 py-3 first:pt-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] font-medium text-ink">
                      {titleFor(session.courseSlug)}
                    </span>
                    <span className="figure block text-[0.75rem] text-ink-muted">
                      {formatDayLong(session.date)} · {session.start}
                      {session.days > 1 ? ` · ${session.days} days` : ""} ·{" "}
                      {session.seatsLeft} seats
                    </span>
                    {session.note ? (
                      <span className="block text-[0.75rem] text-ink-faint">{session.note}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${titleFor(session.courseSlug)} on ${session.date}`}
                    onClick={() =>
                      onChange(sessions.filter((item) => item.id !== session.id))
                    }
                    className="grid size-8 shrink-0 place-items-center rounded-[8px] text-ink-faint transition-colors hover:bg-accent-soft hover:text-accent"
                  >
                    <Trash size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
