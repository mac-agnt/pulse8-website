"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarBlank,
  CircleNotch,
  Clock,
  ListBullets,
  LockSimple,
  MapPin,
  Users,
  Warning,
} from "@phosphor-icons/react";
import { Button, SubmitButton } from "@/components/ui/Button";
import { FullScreenCalendar, type CalendarData } from "@/components/ui/fullscreen-calendar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/cn";
import { colourFor, families } from "@/lib/course-families";
import { formatDayLong, fromIso, type PublicSession } from "@/lib/schedule";
import type { Delivery } from "@/lib/data";
import { ease } from "@/lib/motion";

type DeliveryFilter = "All" | Delivery;
type View = "list" | "calendar";

const deliveryOptions: DeliveryFilter[] = ["All", "Classroom", "Blended", "Online"];

const control =
  "h-10 rounded-full border border-border bg-surface px-4 text-[0.875rem] text-ink transition-colors duration-200 hover:border-ink-faint";

const field =
  "h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-faint focus-visible:border-ink-faint";

const fieldLabel = "mb-2 block text-[0.875rem] font-medium text-ink";

const card = "rounded-[var(--radius-card)] border border-border bg-surface";

/** Most places one online booking can take; larger groups enquire. Matches the API. */
const MAX_PLACES = 6;

const EMPTY_MESSAGE =
  "No upcoming dates match your filters. Clear your filters or enquire about this course.";

function availability(session: PublicSession): { label: string; low: boolean } {
  if (session.sample) return { label: "Sample date", low: false };
  if (session.seatsLeft === 0) return { label: "Fully booked", low: false };
  if (session.seatsLeft === 1) return { label: "1 place left", low: true };
  if (session.seatsLeft <= 3) return { label: `${session.seatsLeft} places left`, low: true };
  return { label: `${session.seatsLeft} places available`, low: false };
}

function enquireHref(slug: string) {
  return `/contact?course=${encodeURIComponent(slug)}`;
}

/** One date for one course, with its single next step. */
function SessionRow({
  session,
  highlighted,
  showDate,
  compact = false,
  onBook,
}: {
  session: PublicSession;
  highlighted: boolean;
  showDate: boolean;
  /** narrow column (calendar side panel): stack everything */
  compact?: boolean;
  onBook: (session: PublicSession) => void;
}) {
  const { label, low } = availability(session);

  return (
    <div
      id={`session-${session.id}`}
      className={cn(
        "relative scroll-mt-32 overflow-hidden rounded-[var(--radius-card)] border bg-surface p-4 pl-5 transition-colors duration-300",
        highlighted ? "border-ink ring-2 ring-ink" : "border-border-soft",
      )}
    >
      <span
        aria-hidden="true"
        style={{ backgroundColor: colourFor(session.courseSlug) }}
        className="absolute inset-y-0 left-0 w-1"
      />
      <div
        className={cn(
          "flex flex-col gap-4",
          !compact && "md:flex-row md:items-center md:justify-between",
        )}
      >
        <div className="min-w-0">
          <p className="figure text-[0.8125rem] font-medium text-ink-muted">
            {showDate ? `${formatDayLong(session.date)}, ` : ""}
            {session.start} to {session.end}
            {session.days > 1 ? `, ${session.days} days` : ""}
          </p>
          <h3 className="mt-1 text-[1.0625rem] leading-snug font-semibold text-ink">
            {session.title}
          </h3>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8125rem] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} weight="bold" className="text-ink-faint" />
              {session.venue}
            </span>
            <span className="rounded-full bg-tint px-2.5 py-0.5 text-[0.75rem] font-medium text-ink">
              {session.delivery}
            </span>
            <span className={cn("inline-flex items-center gap-1.5", low && "font-medium text-accent-strong")}>
              <Users size={14} weight="bold" className={low ? "" : "text-ink-faint"} />
              {label}
            </span>
          </div>
        </div>

        <div className={cn("flex shrink-0 flex-col gap-2", !compact && "sm:flex-row")}>
          <Button
            href={`/courses/${session.courseSlug}`}
            variant="secondary"
            className={cn("w-full", !compact && "sm:w-auto")}
          >
            View course
          </Button>
          {session.action === "book" ? (
            <SubmitButton
              type="button"
              onClick={() => onBook(session)}
              className={cn("w-full", !compact && "sm:w-auto")}
            >
              Book a place
            </SubmitButton>
          ) : (
            <Button href={enquireHref(session.courseSlug)} className={cn("w-full", !compact && "sm:w-auto")}>
              Enquire about this course
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Booking summary. The total is shown by Stripe Checkout before the customer pays. */
function BookingForm({
  session,
  onBack,
}: {
  session: PublicSession;
  onBack: () => void;
}) {
  const [places, setPlaces] = useState(1);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  // One key per attempt: a double click or a retry reuses the same order and hold.
  const [attemptKey] = useState(() => crypto.randomUUID());
  const maxPlaces = Math.max(1, Math.min(session.seatsLeft, MAX_PLACES));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const form = new FormData(event.currentTarget);

    setStatus("sending");
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          quantity: places,
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          attemptKey,
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (response.ok && result?.url) {
        window.location.assign(result.url);
        return;
      }
      setStatus("error");
      setError(
        result?.error ??
          "We couldn't start your booking. Please try again or email info@pulse8.ie.",
      );
    } catch {
      setStatus("error");
      setError("We couldn't start your booking. Please try again or email info@pulse8.ie.");
    }
  }

  return (
    <div className={cn(card, "mx-auto max-w-[38rem] p-5 md:p-7")}>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-[0.875rem] font-medium text-ink-muted transition-colors duration-200 hover:text-ink"
      >
        <ArrowLeft size={15} weight="bold" />
        Back to dates
      </button>

      <h2 className="mt-5 text-xl font-semibold text-ink">{session.title}</h2>
      <p className="mt-2 text-[0.9375rem] text-ink-muted">
        {formatDayLong(session.date)}, {session.start} to {session.end}
        {session.days > 1 ? `, ${session.days} days` : ""}. {session.venue}.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <div>
          <label className={fieldLabel} htmlFor="booking-name">
            Name
          </label>
          <input id="booking-name" name="name" required maxLength={120} autoComplete="name" className={field} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={fieldLabel} htmlFor="booking-email">
              Email
            </label>
            <input
              id="booking-email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              className={field}
            />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="booking-phone">
              Phone
            </label>
            <input
              id="booking-phone"
              name="phone"
              type="tel"
              required
              maxLength={40}
              autoComplete="tel"
              className={field}
            />
          </div>
        </div>
        <div>
          <label className={fieldLabel} htmlFor="booking-places">
            Places
          </label>
          <input
            id="booking-places"
            type="number"
            min={1}
            max={maxPlaces}
            value={places}
            onChange={(event) =>
              setPlaces(Math.min(maxPlaces, Math.max(1, Number(event.target.value) || 1)))
            }
            className={cn(field, "sm:w-32")}
          />
          <p className="mt-2 text-[0.8125rem] text-ink-muted">
            Up to {maxPlaces} online. For a bigger group,{" "}
            <Link href={enquireHref(session.courseSlug)} className="text-ink underline underline-offset-4">
              enquire about this course
            </Link>
            .
          </p>
        </div>

        <p className="flex items-start gap-2 border-t border-border-soft pt-4 text-[0.875rem] text-ink-muted">
          <LockSimple size={16} weight="bold" className="mt-0.5 shrink-0 text-ink-faint" />
          You&rsquo;ll see the total in euro and pay on Stripe&rsquo;s secure page. We hold
          your place for 30 minutes while you pay.
        </p>

        <div role="alert" aria-live="assertive">
          {status === "error" && error ? (
            <p className="flex items-start gap-2 text-[0.875rem] text-accent-strong">
              <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </p>
          ) : null}
        </div>

        <SubmitButton type="submit" size="lg" disabled={status === "sending"} aria-busy={status === "sending" || undefined}>
          {status === "sending" ? (
            <>
              <CircleNotch size={17} weight="bold" className="animate-spin" />
              Opening secure payment
            </>
          ) : (
            "Continue to secure payment"
          )}
        </SubmitButton>
      </form>
    </div>
  );
}

/**
 * Course dates.
 *
 * A list of upcoming dates first, on every screen size, sorted by start time
 * (Irish time); the month grid is one tap away under Calendar. Both views read
 * the same filtered list, so they always agree. The course and format filters
 * live in the URL (?course=, ?format=), so a shared link, a course page's
 * "See dates" and the back button all restore them; ?session=<id> opens on one
 * date. Each date's next step (book or enquire) is decided on the server.
 */
export function BookingCalendar({
  sessions,
  courses,
  today,
  initialCourse,
  initialFormat,
  initialSession,
  cancelled = false,
  sampleMode = false,
}: {
  sessions: PublicSession[];
  /** every published course, so one with no dates can still be chosen */
  courses: Array<{ slug: string; title: string }>;
  today: string;
  initialCourse?: string;
  initialFormat?: string;
  initialSession?: string;
  /** back from a cancelled Stripe Checkout */
  cancelled?: boolean;
  /** development fixtures are showing */
  sampleMode?: boolean;
}) {
  const knownCourse = initialCourse && courses.some((c) => c.slug === initialCourse) ? initialCourse : "All";
  const knownFormat = deliveryOptions.find((option) => option === initialFormat) ?? "All";
  const linked = initialSession ? sessions.find((s) => s.id === initialSession) : undefined;

  const [courseSlug, setCourseSlug] = useState(linked?.courseSlug ?? knownCourse);
  const [delivery, setDelivery] = useState<DeliveryFilter>(knownFormat);
  const [view, setView] = useState<View>("list");
  const [selectedDate, setSelectedDate] = useState<string | null>(linked?.date ?? null);
  const [highlighted, setHighlighted] = useState<string | null>(linked?.id ?? null);
  const [booking, setBooking] = useState<PublicSession | null>(null);
  const [showCancelled, setShowCancelled] = useState(cancelled);

  const panelRef = useRef<HTMLDivElement>(null);
  const isCompact = useMediaQuery("(max-width: 1023px)");

  // Keep the filters in the address bar without a server round trip.
  useEffect(() => {
    const params = new URLSearchParams();
    if (courseSlug !== "All") params.set("course", courseSlug);
    if (delivery !== "All") params.set("format", delivery);
    if (highlighted) params.set("session", highlighted);
    const query = params.toString();
    window.history.replaceState(window.history.state, "", query ? `/book?${query}` : "/book");
  }, [courseSlug, delivery, highlighted]);

  // Bring a linked date into view once.
  useEffect(() => {
    if (!linked) return;
    // After the router's own scroll restoration has run.
    const timer = window.setTimeout(() => {
      document.getElementById(`session-${linked.id}`)?.scrollIntoView({ block: "center" });
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      sessions.filter(
        (session) =>
          (courseSlug === "All" || session.courseSlug === courseSlug) &&
          (delivery === "All" || session.delivery === delivery),
      ),
    [sessions, courseSlug, delivery],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, PublicSession[]>();
    for (const session of filtered) {
      const list = map.get(session.date);
      if (list) list.push(session);
      else map.set(session.date, [session]);
    }
    return map;
  }, [filtered]);

  const calendarData: CalendarData[] = useMemo(
    () =>
      [...byDate].map(([date, daySessions]) => ({
        day: fromIso(date),
        events: daySessions.map((session) => ({
          id: session.id,
          name: session.title,
          time: `${session.start} to ${session.end}`,
          datetime: `${session.date}T${session.start}`,
          unavailable: session.seatsLeft === 0,
          colour: colourFor(session.courseSlug),
        })),
      })),
    [byDate],
  );

  const firstDate = filtered[0]?.date ?? null;
  const panelDate = selectedDate && byDate.has(selectedDate) ? selectedDate : (selectedDate ?? firstDate);
  const panelSessions = panelDate ? (byDate.get(panelDate) ?? []) : [];
  const nextDateWithCourses =
    panelDate && panelSessions.length === 0
      ? (filtered.find((session) => session.date > panelDate)?.date ?? firstDate)
      : null;

  useEffect(() => {
    if (!isCompact || !selectedDate || view !== "calendar") return;
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isCompact, selectedDate, view]);

  function changeFilters(next: () => void) {
    next();
    setSelectedDate(null);
    setHighlighted(null);
  }

  function clearFilters() {
    changeFilters(() => {
      setCourseSlug("All");
      setDelivery("All");
    });
  }

  if (booking) {
    return <BookingForm session={booking} onBack={() => setBooking(null)} />;
  }

  const filtersActive = courseSlug !== "All" || delivery !== "All";
  const empty = (
    <div className="rounded-[var(--radius-card)] border border-dashed border-border px-6 py-10 text-center">
      <Clock size={26} weight="bold" className="mx-auto text-ink-faint" />
      <p className="mx-auto mt-4 max-w-[42ch] text-ink-muted">{EMPTY_MESSAGE}</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {filtersActive ? (
          <SubmitButton type="button" variant="secondary" onClick={clearFilters}>
            Clear filters
          </SubmitButton>
        ) : null}
        <Button href={courseSlug !== "All" ? enquireHref(courseSlug) : "/contact"}>
          Enquire about this course
        </Button>
      </div>
    </div>
  );

  const filters = (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
      <label>
        <span className="sr-only">Course</span>
        <select
          value={courseSlug}
          onChange={(event) => changeFilters(() => setCourseSlug(event.target.value))}
          className={cn(control, "w-full md:w-[16rem]")}
        >
          <option value="All">All courses</option>
          {courses.map(({ slug, title }) => (
            <option key={slug} value={slug}>
              {title}
            </option>
          ))}
        </select>
      </label>

      <div
        role="group"
        aria-label="Format"
        className="inline-flex w-fit max-w-full overflow-x-auto rounded-full bg-tint p-1"
      >
        {deliveryOptions.map((option) => {
          const active = option === delivery;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => changeFilters(() => setDelivery(option))}
              className={cn(
                "relative h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-200 sm:px-3.5",
                active ? "text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="format-pill"
                  aria-hidden="true"
                  transition={{ duration: 0.3, ease }}
                  className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_2px_rgb(15_23_42/0.12)]"
                />
              ) : null}
              <span className="relative">{option === "All" ? "Any" : option}</span>
            </button>
          );
        })}
      </div>

      {filtersActive ? (
        <button
          type="button"
          onClick={clearFilters}
          className="w-fit text-[0.875rem] font-medium text-ink underline underline-offset-4"
        >
          Clear filters
        </button>
      ) : null}

      <div role="group" aria-label="View" className="inline-flex w-fit rounded-full border border-border p-1 md:ml-auto">
        {(
          [
            { key: "list", label: "List", icon: ListBullets },
            { key: "calendar", label: "Calendar", icon: CalendarBlank },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => setView(key)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-medium transition-colors duration-200",
              view === key ? "bg-ink text-bg" : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon size={15} weight="bold" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  const notices = (
    <>
      {showCancelled ? (
        <div role="status" className="mb-5 flex items-start justify-between gap-4 rounded-[var(--radius-card)] border border-border bg-tint px-4 py-3 text-[0.9375rem] text-ink">
          <span>Payment cancelled. You have not been charged and no place was booked.</span>
          <button
            type="button"
            onClick={() => setShowCancelled(false)}
            className="shrink-0 font-medium underline underline-offset-4"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {sampleMode ? (
        <p className="mb-5 rounded-[var(--radius-card)] border border-dashed border-border px-4 py-3 text-[0.8125rem] text-ink-muted">
          Development build: sample dates are mixed in with published ones. Sample dates
          cannot be booked and are never shown on the live site.
        </p>
      ) : null}
    </>
  );

  if (view === "list") {
    const dates = [...byDate.keys()];
    return (
      <div className="rounded-[1.75rem] border border-border bg-surface p-5 shadow-[0_30px_80px_-30px_rgb(15_23_42/0.25)] md:p-8">
        {notices}
        {filters}
        <p className="figure mt-5 text-[0.875rem] text-ink-muted" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "date" : "dates"}
        </p>
        <div className="mt-5">
          {dates.length === 0 ? (
            empty
          ) : (
            <ol className="flex flex-col gap-8">
              {dates.map((date) => (
                <li key={date}>
                  <h2 className="text-[0.9375rem] font-semibold text-ink">
                    {date === today ? "Today, " : ""}
                    {formatDayLong(date)}
                  </h2>
                  <ul className="mt-3 flex flex-col gap-3">
                    {(byDate.get(date) ?? []).map((session) => (
                      <li key={session.id}>
                        <SessionRow
                          session={session}
                          highlighted={highlighted === session.id}
                          showDate={false}
                          onBook={setBooking}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    );
  }

  const headingDate = panelDate ? fromIso(panelDate) : null;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-[0_30px_80px_-30px_rgb(15_23_42/0.25)]">
      <div className="p-5 pb-0 md:p-8 md:pb-0">{notices}</div>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="p-5 md:p-8">
          <FullScreenCalendar
            data={calendarData}
            selectedDay={headingDate ?? undefined}
            onSelectDay={(day) => {
              setSelectedDate(format(day, "yyyy-MM-dd"));
              setHighlighted(null);
            }}
            minDate={fromIso(today)}
            headerSlot={filters}
          />

          <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            {families.map((family) => (
              <li key={family.key} className="flex items-center gap-2 text-[0.8125rem] text-ink-muted">
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: `var(${family.token})` }}
                  className="size-2.5 rounded-full"
                />
                {family.label}
              </li>
            ))}
          </ul>
        </div>

        <aside
          ref={panelRef}
          aria-label="Courses on the selected date"
          className="scroll-mt-24 border-t border-border-soft bg-bg p-5 md:p-8 xl:border-t-0 xl:border-l"
        >
          <div className="xl:sticky xl:top-28">
            {filtered.length === 0 ? (
              empty
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={panelDate ?? "none"}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease }}
                >
                  {headingDate ? (
                    <div className="flex items-end justify-between gap-4 border-b border-border-soft pb-5">
                      <p className="figure text-[2rem] leading-none font-semibold tracking-[-0.04em] text-ink">
                        {format(headingDate, "EEEE d MMMM")}
                      </p>
                      <p className="figure pb-1 text-[0.875rem] text-ink-muted">
                        {panelSessions.length} {panelSessions.length === 1 ? "course" : "courses"}
                      </p>
                    </div>
                  ) : null}

                  {panelSessions.length > 0 ? (
                    <div className="mt-5 grid gap-3">
                      {panelSessions.map((session) => (
                        <SessionRow
                          key={session.id}
                          session={session}
                          highlighted={highlighted === session.id}
                          showDate={false}
                          compact
                          onBook={setBooking}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-6">
                      <p className="max-w-[36ch] text-ink-muted">
                        Nothing on {panelDate ? formatDayLong(panelDate) : "this date"}.
                      </p>
                      {nextDateWithCourses ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDate(nextDateWithCourses)}
                          className="mt-4 text-[0.9375rem] font-medium text-ink underline underline-offset-4"
                        >
                          Go to {formatDayLong(nextDateWithCourses)}
                        </button>
                      ) : null}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
