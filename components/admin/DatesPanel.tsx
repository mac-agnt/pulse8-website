"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowSquareOut, CalendarPlus, PencilSimple, Trash, X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { ExtraSession } from "@/lib/content";
import { isoDate } from "@/lib/schedule";
import { Card, Field, Select, TextInput, Toggle } from "@/components/admin/Field";
import { AdminButton, Badge, EuroInput, Notice } from "@/components/admin/ui";
import { adminApi } from "@/components/admin/api";

type DateRow = ExtraSession & { booked: number };
type CourseOption = {
  slug: string;
  title: string;
  duration: string | null;
  price: number | null;
  maxParticipants: number | null;
  draft: boolean;
};
type DatesData = { dates: DateRow[]; courses: CourseOption[] };

const DEFAULT_VENUE = "Pulse 8 Training Centre, Dublin";

type Draft = {
  courseSlug: string;
  date: string;
  start: string;
  end: string;
  days: string;
  seatsLeft: string;
  venue: string;
  online: boolean;
  priceOverride: string;
  note: string;
};

function draftFrom(date: ExtraSession | null, courses: CourseOption[]): Draft {
  if (!date) {
    const first = courses.find((course) => !course.draft) ?? courses[0];
    return {
      courseSlug: first?.slug ?? "",
      date: "",
      start: "09:30",
      end: "",
      days: "1",
      seatsLeft: String(first?.maxParticipants ?? 10),
      venue: DEFAULT_VENUE,
      online: false,
      priceOverride: "",
      note: "",
    };
  }
  return {
    courseSlug: date.courseSlug,
    date: date.date,
    start: date.start,
    end: date.end ?? "",
    days: String(date.days),
    seatsLeft: String(date.seatsLeft),
    venue: date.venue ?? DEFAULT_VENUE,
    online: date.online,
    priceOverride: typeof date.priceOverride === "number" ? String(date.priceOverride) : "",
    note: date.note ?? "",
  };
}

function longDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function monthOf(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IE", { month: "long", year: "numeric", timeZone: "UTC" });
}

function DateForm({
  initial,
  courses,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft;
  courses: CourseOption[];
  busy: boolean;
  submitLabel: string;
  onSubmit: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = (values: Partial<Draft>) => setDraft((current) => ({ ...current, ...values }));
  const course = courses.find((item) => item.slug === draft.courseSlug);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
      }}
    >
      <Field label="Course" htmlFor="date-course" className="sm:col-span-2">
        <Select
          id="date-course"
          value={draft.courseSlug}
          onChange={(event) => {
            const next = courses.find((item) => item.slug === event.target.value);
            set({
              courseSlug: event.target.value,
              ...(next?.maxParticipants && draft.seatsLeft === String(course?.maxParticipants ?? 10)
                ? { seatsLeft: String(next.maxParticipants) }
                : {}),
            });
          }}
        >
          {courses.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.title}
              {item.draft ? " (hidden draft)" : ""}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Date" htmlFor="date-day">
        <TextInput
          id="date-day"
          type="date"
          required
          min={initial.date ? undefined : isoDate(new Date())}
          value={draft.date}
          onChange={(event) => set({ date: event.target.value })}
        />
      </Field>
      <Field label="Days in a row" htmlFor="date-days">
        <TextInput id="date-days" type="number" min={1} max={10} required value={draft.days} onChange={(event) => set({ days: event.target.value })} />
      </Field>
      <Field label="Starts" htmlFor="date-start">
        <TextInput id="date-start" type="time" required value={draft.start} onChange={(event) => set({ start: event.target.value })} />
      </Field>
      <Field label="Ends" htmlFor="date-end" hint={course?.duration ? `Blank: worked out from ${course.duration}` : "Blank: worked out from the course length"}>
        <TextInput id="date-end" type="time" value={draft.end} onChange={(event) => set({ end: event.target.value })} />
      </Field>
      <Field label="Places for online booking" htmlFor="date-places" hint="0 shows the date as full.">
        <TextInput id="date-places" type="number" min={0} max={200} required value={draft.seatsLeft} onChange={(event) => set({ seatsLeft: event.target.value })} />
      </Field>
      <Field label="Price for this date" hint={course?.price ? `Blank: the course price, €${course.price}` : "Blank: the course price (none set: Enquire)"}>
        <EuroInput label="Price for this date" placeholder="Course price" value={draft.priceOverride} onChange={(value) => set({ priceOverride: value })} />
      </Field>
      <Field label="Venue" htmlFor="date-venue" className="sm:col-span-2">
        <TextInput
          id="date-venue"
          value={draft.online ? "Live online" : draft.venue}
          disabled={draft.online}
          maxLength={120}
          onChange={(event) => set({ venue: event.target.value })}
        />
      </Field>
      <Field label="Note for staff (not shown on the site)" htmlFor="date-note" className="sm:col-span-2">
        <TextInput id="date-note" maxLength={200} value={draft.note} onChange={(event) => set({ note: event.target.value })} placeholder="e.g. trainer, room" />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
        <Toggle checked={draft.online} onChange={(online) => set({ online })} label="Runs live online" />
        <div className="flex gap-2">
          <AdminButton variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant="primary" disabled={busy || !draft.date || !draft.courseSlug}>
            {busy ? "Saving…" : submitLabel}
          </AdminButton>
        </div>
      </div>
    </form>
  );
}

const payload = (draft: Draft) => ({
  courseSlug: draft.courseSlug,
  date: draft.date,
  start: draft.start,
  end: draft.end,
  days: Number(draft.days),
  seatsLeft: Number(draft.seatsLeft),
  venue: draft.online ? "" : draft.venue,
  online: draft.online,
  priceOverride: draft.priceOverride,
  note: draft.note,
});

/**
 * Course dates. Pulse 8's own classroom dates: add, change, close. Each save
 * is live on /book straight away. Blended practical days are added in
 * Blended Learning's admin and appear on /book from there.
 */
export function DatesPanel() {
  const [data, setData] = useState<DatesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [view, setView] = useState<"upcoming" | "past">("upcoming");

  const fail = useCallback((cause: Error) => setError(cause.message), []);
  const load = useCallback(() => adminApi<DatesData>("/api/admin/dates").then(setData, fail), [fail]);
  useEffect(() => {
    adminApi<DatesData>("/api/admin/dates").then(setData, fail);
  }, [fail]);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await work();
      await load();
      setNotice(done);
      return true;
    } catch (cause) {
      setError((cause as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const today = isoDate(new Date());
  const titles = useMemo(() => new Map(data?.courses.map((course) => [course.slug, course] as const)), [data]);
  const list = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.dates].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    return view === "upcoming" ? sorted.filter((date) => date.date >= today) : sorted.filter((date) => date.date < today).reverse();
  }, [data, view, today]);

  if (!data) {
    return error ? <Notice tone="error">{error}</Notice> : <p className="text-[0.875rem] text-ink-faint">Loading dates…</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}

      {adding ? (
        <Card title="Add a date" description="It appears on the booking page as soon as you save.">
          <DateForm
            initial={draftFrom(null, data.courses)}
            courses={data.courses}
            busy={busy}
            submitLabel="Add date"
            onCancel={() => setAdding(false)}
            onSubmit={async (draft) => {
              const ok = await run(
                () => adminApi("/api/admin/dates", { method: "POST", json: payload(draft) }),
                "Date added. It's on the booking page now.",
              );
              if (ok) setAdding(false);
            }}
          />
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-[var(--radius-control)] border border-border bg-surface p-1">
          {(["upcoming", "past"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                "rounded-[7px] px-3 py-1.5 text-[0.8125rem] font-medium capitalize transition-colors",
                view === id ? "bg-tint text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {id}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <a
            href="/book"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-3 py-2 text-[0.8125rem] font-medium text-ink-muted hover:bg-tint hover:text-ink"
          >
            <ArrowSquareOut size={15} /> See the booking page
          </a>
          {!adding ? (
            <AdminButton variant="primary" icon={<CalendarPlus size={16} />} onClick={() => setAdding(true)}>
              Add a date
            </AdminButton>
          ) : null}
        </div>
      </div>

      {list.length === 0 ? (
        <Card>
          <p className="text-[0.875rem] text-ink-muted">
            {view === "upcoming" ? "No upcoming dates. Add one and it goes straight onto the booking page." : "No past dates."}
          </p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          {list.map((date, index) => {
            const course = titles.get(date.courseSlug);
            const month = monthOf(date.date);
            const showMonth = index === 0 || monthOf(list[index - 1].date) !== month;
            const full = date.booked >= date.seatsLeft;
            const price = typeof date.priceOverride === "number" ? date.priceOverride : course?.price ?? null;
            return (
              <div key={date.id}>
                {showMonth ? (
                  <h3 className="border-b border-border bg-bg px-4 py-2 text-[11px] font-semibold tracking-wider text-ink-faint uppercase md:px-5">
                    {month}
                  </h3>
                ) : null}
                <div className={cn("border-b border-border px-4 py-3.5 last:border-b-0 md:px-5", date.closed && "bg-bg/60")}>
                  {editing === date.id ? (
                    <DateForm
                      initial={draftFrom(date, data.courses)}
                      courses={data.courses}
                      busy={busy}
                      submitLabel="Save changes"
                      onCancel={() => setEditing(null)}
                      onSubmit={async (draft) => {
                        const ok = await run(
                          () => adminApi(`/api/admin/dates/${date.id}`, { method: "PATCH", json: payload(draft) }),
                          "Saved. The booking page shows the change now.",
                        );
                        if (ok) setEditing(null);
                      }}
                    />
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      <div className="w-24 shrink-0">
                        <p className="text-[0.875rem] font-semibold text-ink">{longDay(date.date)}</p>
                        <p className="figure text-[0.75rem] text-ink-muted">
                          {date.start}
                          {date.end ? `–${date.end}` : ""}
                          {date.days > 1 ? ` · ${date.days} days` : ""}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1 basis-48">
                        <p className={cn("truncate text-[0.875rem] font-medium", date.closed ? "text-ink-muted" : "text-ink")}>
                          {course?.title ?? date.courseSlug}
                        </p>
                        <p className="truncate text-[0.75rem] text-ink-faint">
                          {date.online ? "Live online" : date.venue ?? DEFAULT_VENUE}
                          {date.note ? ` · ${date.note}` : ""}
                        </p>
                      </div>
                      <div className="flex w-36 shrink-0 flex-col gap-1">
                        <p className="figure text-[0.75rem] text-ink-muted">
                          {date.booked} of {date.seatsLeft} booked
                        </p>
                        <span className="h-1.5 overflow-hidden rounded-full bg-tint">
                          <span
                            className={cn("block h-full rounded-full", date.closed ? "bg-ink-faint/40" : full ? "bg-accent" : "bg-navy")}
                            style={{ width: `${date.seatsLeft ? Math.min(100, (date.booked / date.seatsLeft) * 100) : 100}%` }}
                          />
                        </span>
                      </div>
                      <div className="flex w-28 shrink-0 flex-wrap items-center gap-1.5">
                        <span className="figure text-[0.8125rem] text-ink">{price === null ? "Enquire" : `€${price}`}</span>
                        {typeof date.priceOverride === "number" ? <Badge tone="muted">this date</Badge> : null}
                      </div>
                      <div className="flex w-20 shrink-0">
                        {date.closed ? <Badge tone="muted">Closed</Badge> : full ? <Badge tone="warn">Full</Badge> : <Badge tone="good">Open</Badge>}
                      </div>
                      <div className="ml-auto flex shrink-0 gap-1">
                        <AdminButton size="sm" variant="ghost" icon={<PencilSimple size={14} />} onClick={() => setEditing(date.id)} disabled={busy}>
                          Edit
                        </AdminButton>
                        <AdminButton
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          icon={date.closed ? undefined : <X size={14} />}
                          onClick={() =>
                            void run(
                              () => adminApi(`/api/admin/dates/${date.id}`, { method: "PATCH", json: { closed: !date.closed } }),
                              date.closed ? "Reopened. It's back on the booking page." : "Closed. It's off the booking page; existing bookings stand.",
                            )
                          }
                        >
                          {date.closed ? "Reopen" : "Close"}
                        </AdminButton>
                        {date.booked === 0 ? (
                          <AdminButton
                            size="sm"
                            variant="ghost"
                            aria-label="Delete this date"
                            disabled={busy}
                            icon={<Trash size={14} />}
                            onClick={() => {
                              if (!window.confirm("Delete this date? Use Close instead if anyone might have booked it.")) return;
                              void run(() => adminApi(`/api/admin/dates/${date.id}`, { method: "DELETE" }), "Date deleted.");
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[0.75rem] text-ink-faint">
        Blended learning practical days are added in Blended Learning&apos;s admin and appear on the booking page from there.
        Booked counts include people paying right now.
      </p>
    </div>
  );
}
