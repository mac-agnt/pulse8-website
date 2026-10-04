"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  CircleNotch,
  Clock,
  MapPin,
  Users,
} from "@phosphor-icons/react";
import { Button, SubmitButton } from "@/components/ui/Button";
import {
  FullScreenCalendar,
  type CalendarData,
} from "@/components/ui/fullscreen-calendar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/cn";
import { colourFor, families } from "@/lib/course-families";
import {
  formatDayLong,
  formatPrice,
  fromIso,
  type Session,
} from "@/lib/schedule";
import type { Delivery } from "@/lib/data";
import { ease } from "@/lib/motion";

type DeliveryFilter = "All" | Delivery;

const deliveryOptions: DeliveryFilter[] = ["All", "Classroom", "Blended", "Online"];

const control =
  "h-9 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-[0.875rem] text-ink transition-colors duration-200 hover:border-ink-faint";

const field =
  "h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-faint focus-visible:border-ink-faint";

const fieldLabel = "mb-2 block text-[0.875rem] font-medium text-ink";

const card = "rounded-[var(--radius-card)] border border-border bg-surface";

function seatLabel(session: Session) {
  if (session.seatsLeft === 0) return "Fully booked";
  if (session.seatsLeft === 1) return "1 place left";
  if (session.seatsLeft <= 3) return `${session.seatsLeft} places left`;
  return `${session.seatsLeft} of ${session.capacity} places`;
}

/** One bookable time on the selected day. */
function SessionRow({
  session,
  onBook,
}: {
  session: Session;
  onBook: (session: Session) => void;
}) {
  const full = session.seatsLeft === 0;
  const low = !full && session.seatsLeft <= 3;
  const colour = colourFor(session.courseSlug);

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-surface p-4 pl-5">
      <span
        aria-hidden="true"
        style={{ backgroundColor: colour }}
        className="absolute inset-y-0 left-0 w-1"
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="figure text-[0.8125rem] font-medium text-ink-muted">
            {session.start} to {session.end}
            {session.days > 1 ? `, ${session.days} days` : ""}
          </p>
          <h3 className="mt-1 text-[1.0625rem] leading-snug font-semibold text-ink">
            {session.title}
          </h3>
        </div>

        <div className="shrink-0 text-right">
          <p className="figure text-lg leading-none font-semibold text-ink">
            {formatPrice(session.price)}
          </p>
          <p className="mt-1 text-[0.75rem] whitespace-nowrap text-ink-faint">per person</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8125rem] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={14} weight="bold" className="text-ink-faint" />
          {session.venue}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5",
            low && "font-medium text-accent-strong",
          )}
        >
          <Users size={14} weight="bold" className={low ? "" : "text-ink-faint"} />
          {seatLabel(session)}
        </span>
        <span className="rounded-full bg-tint px-2.5 py-0.5 text-[0.75rem] font-medium text-ink">
          {session.delivery}
        </span>
      </div>

      <div className="mt-4">
        {full ? (
          <Button href="/#contact" variant="secondary" className="w-full">
            Join the waiting list
          </Button>
        ) : (
          <SubmitButton type="button" onClick={() => onBook(session)} className="w-full">
            Book for {formatPrice(session.price)}
          </SubmitButton>
        )}
      </div>
    </div>
  );
}

/**
 * Course schedule and booking.
 *
 * A month of dates on one grid, every course written into the day it runs.
 * Picking a day opens its times underneath, with the price on each one, so
 * nothing here asks for a quote. State is local and the form has no endpoint on
 * this build.
 */
export function BookingCalendar({
  sessions,
  today,
  initialCourse,
}: {
  sessions: Session[];
  today: string;
  /** slug from ?course=, so a course card can land straight on its own times */
  initialCourse?: string;
}) {
  const preselected =
    initialCourse && sessions.some((session) => session.courseSlug === initialCourse)
      ? initialCourse
      : "All";

  const [courseSlug, setCourseSlug] = useState(preselected);
  const [delivery, setDelivery] = useState<DeliveryFilter>("All");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [booking, setBooking] = useState<Session | null>(null);
  const [places, setPlaces] = useState(1);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const panelRef = useRef<HTMLDivElement>(null);
  const isCompact = useMediaQuery("(max-width: 1023px)");

  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const session of sessions) seen.set(session.courseSlug, session.title);
    return [...seen].sort((a, b) => a[1].localeCompare(b[1]));
  }, [sessions]);

  const filtered = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.date >= today &&
          (courseSlug === "All" || session.courseSlug === courseSlug) &&
          (delivery === "All" || session.delivery === delivery),
      ),
    [sessions, today, courseSlug, delivery],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Session[]>();
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
          meta: formatPrice(session.price),
          unavailable: session.seatsLeft === 0,
          colour: colourFor(session.courseSlug),
        })),
      })),
    [byDate],
  );

  /** The first day with dates on it, so the panel is never empty on arrival. */
  const firstDate = filtered[0]?.date ?? null;
  const panelDate = selectedDate ?? firstDate;
  const panelSessions = panelDate ? (byDate.get(panelDate) ?? []) : [];

  const nextDateWithCourses = useMemo(() => {
    if (!panelDate || panelSessions.length > 0) return null;
    return filtered.find((session) => session.date > panelDate)?.date ?? firstDate;
  }, [filtered, panelDate, panelSessions.length, firstDate]);

  // On a phone the day's times sit below the fold, so bring them up.
  useEffect(() => {
    if (!isCompact || !selectedDate) return;
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isCompact, selectedDate]);

  function startBooking(session: Session) {
    setBooking(session);
    setPlaces(1);
    setStatus("idle");
  }

  function resetFilters(next: () => void) {
    next();
    setSelectedDate(null);
    setBooking(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    await new Promise((resolve) => setTimeout(resolve, 700));
    setStatus("sent");
  }

  if (booking) {
    const total = booking.price * Math.max(1, places);

    return (
      <div className={cn(card, "mx-auto max-w-[38rem] p-5 md:p-7")}>
        {status === "sent" ? (
          <div>
            <CheckCircle size={28} weight="fill" className="text-accent" />
            <h2 className="mt-4 text-xl font-semibold text-ink">Place booked</h2>
            <p className="mt-3 text-ink-muted">
              {booking.title} on {formatDayLong(booking.date)} at {booking.start}.{" "}
              {places === 1 ? "One place" : `${places} places`} at{" "}
              {formatPrice(booking.price)} each, {formatPrice(total)} in total. Joining
              details follow by email within one working day.
            </p>
            <button
              type="button"
              onClick={() => setBooking(null)}
              className="mt-6 text-[0.9375rem] font-medium text-ink underline underline-offset-4"
            >
              Book another date
            </button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setBooking(null)}
              className="inline-flex items-center gap-2 text-[0.875rem] font-medium text-ink-muted transition-colors duration-200 hover:text-ink"
            >
              <ArrowLeft size={15} weight="bold" />
              Back to dates
            </button>

            <h2 className="mt-5 text-xl font-semibold text-ink">{booking.title}</h2>
            <p className="mt-2 text-[0.9375rem] text-ink-muted">
              {formatDayLong(booking.date)}, {booking.start} to {booking.end}
              {booking.days > 1 ? `, ${booking.days} days` : ""}. {booking.venue}.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-4">
              <div>
                <label className={fieldLabel} htmlFor="booking-name">
                  Name
                </label>
                <input id="booking-name" required autoComplete="name" className={field} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel} htmlFor="booking-email">
                    Email
                  </label>
                  <input
                    id="booking-email"
                    type="email"
                    required
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
                    type="tel"
                    required
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
                  max={booking.seatsLeft}
                  value={places}
                  onChange={(event) => setPlaces(Number(event.target.value) || 1)}
                  className={cn(field, "sm:w-32")}
                />
              </div>

              <dl className="mt-1 flex items-end justify-between border-t border-border-soft pt-4">
                <dt className="text-[0.9375rem] text-ink-muted">
                  {places} × {formatPrice(booking.price)}
                </dt>
                <dd className="figure text-2xl font-semibold text-ink">
                  {formatPrice(total)}
                </dd>
              </dl>

              <SubmitButton type="submit" size="lg" disabled={status === "sending"}>
                {status === "sending" ? (
                  <>
                    <CircleNotch size={17} weight="bold" className="animate-spin" />
                    Taking your place
                  </>
                ) : (
                  `Pay ${formatPrice(total)} and book`
                )}
              </SubmitButton>
            </form>
          </div>
        )}
      </div>
    );
  }

  const headingDate = panelDate ? fromIso(panelDate) : null;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-[0_30px_80px_-30px_rgb(15_23_42/0.25)]">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="p-5 md:p-8">
          <FullScreenCalendar
            data={calendarData}
            selectedDay={headingDate ?? undefined}
            onSelectDay={(day) => setSelectedDate(format(day, "yyyy-MM-dd"))}
            minDate={fromIso(today)}
            headerSlot={
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <label>
                  <span className="sr-only">Course</span>
                  <select
                    value={courseSlug}
                    onChange={(event) => resetFilters(() => setCourseSlug(event.target.value))}
                    className={cn(control, "h-10 w-full rounded-full px-4 md:w-[15rem]")}
                  >
                    <option value="All">All courses</option>
                    {courseOptions.map(([slug, title]) => (
                      <option key={slug} value={slug}>
                        {title}
                      </option>
                    ))}
                  </select>
                </label>

                <div
                  role="group"
                  aria-label="Format"
                  className="inline-flex rounded-full bg-tint p-1"
                >
                  {deliveryOptions.map((option) => {
                    const active = option === delivery;
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={active}
                        onClick={() => resetFilters(() => setDelivery(option))}
                        className={cn(
                          "relative h-8 rounded-full px-3.5 text-[0.8125rem] font-medium transition-colors duration-200",
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
              </div>
            }
          />

          {/*
            Colour on the grid encodes course family, so it needs naming
            somewhere. Every chip also carries its course name, so colour is a
            second cue rather than the only one.
          */}
          <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            {families.map((family) => (
              <li
                key={family.key}
                className="flex items-center gap-2 text-[0.8125rem] text-ink-muted"
              >
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
                    <div>
                      <p className="text-[0.8125rem] font-medium tracking-[0.1em] text-accent uppercase">
                        {panelDate === today ? "Today" : format(headingDate, "EEEE")}
                      </p>
                      <p className="figure mt-1 text-[2.5rem] leading-none font-semibold tracking-[-0.04em] text-ink">
                        {format(headingDate, "d MMMM")}
                      </p>
                    </div>
                    <p className="figure pb-1 text-[0.875rem] text-ink-muted">
                      {panelSessions.length}{" "}
                      {panelSessions.length === 1 ? "course" : "courses"}
                    </p>
                  </div>
                ) : null}

                {panelDate && panelSessions.length > 0 ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                    {panelSessions.map((session, index) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease, delay: Math.min(index, 4) * 0.05 }}
                      >
                        <SessionRow session={session} onBook={startBooking} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6">
                    <Clock size={26} weight="bold" className="text-ink-faint" />
                    <h2 className="mt-4 text-lg font-semibold text-ink">
                      Nothing on {panelDate ? formatDayLong(panelDate) : "this date"}
                    </h2>
                    <p className="mt-2 max-w-[36ch] text-ink-muted">
                      Widen the filters, or jump to the next date with courses on it.
                    </p>
                    {nextDateWithCourses ? (
                      <button
                        type="button"
                        onClick={() => setSelectedDate(nextDateWithCourses)}
                        className="mt-5 text-[0.9375rem] font-medium text-ink underline underline-offset-4"
                      >
                        Go to {formatDayLong(nextDateWithCourses)}
                      </button>
                    ) : null}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <p className="mt-8 border-t border-border-soft pt-4 text-[0.75rem] text-ink-faint">
              Sample schedule and prices for this build. Live dates come from the Pulse 8
              booking system.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
