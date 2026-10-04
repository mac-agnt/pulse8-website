"use client";

import * as React from "react";
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfDay,
  startOfMonth,
  startOfToday,
  startOfWeek,
} from "date-fns";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";

export interface CalendarEvent {
  id: string | number;
  name: string;
  /** "09:00 to 12:00" */
  time: string;
  /** ISO datetime, for the <time> element */
  datetime: string;
  /** short trailing detail. Price, on this build. */
  meta?: string;
  /** dims the chip and drops the colour */
  unavailable?: boolean;
  /** CSS colour for the chip. Categorical, set by the caller. */
  colour?: string;
}

export interface CalendarData {
  day: Date;
  events: CalendarEvent[];
}

interface FullScreenCalendarProps {
  data: CalendarData[];
  /** controlled selection. Falls back to today when not given. */
  selectedDay?: Date;
  onSelectDay?: (day: Date) => void;
  /** filters and other controls, dropped into the header beside the month nav */
  headerSlot?: React.ReactNode;
  /** days and months before this cannot be picked. Past dates are not bookable. */
  minDate?: Date;
  /** event chips per desktop cell before the "+ n more" line */
  eventsPerDay?: number;
  className?: string;
}

// Irish weeks start on Monday.
const WEEK = { weekStartsOn: 1 } as const;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const navButton =
  "grid size-10 place-items-center rounded-full border border-border bg-surface text-ink-muted transition-colors duration-200 hover:border-ink-faint hover:text-ink disabled:pointer-events-none disabled:opacity-35";

/**
 * Month calendar.
 *
 * Desktop draws every day as a cell with its courses written out as small
 * coloured chips; below lg the same month collapses to a compact grid with a
 * dot per course, and the detail belongs to whatever the parent renders next to
 * or under it. Both grids ship in the markup and CSS switches between them.
 *
 * Motion: the month slides and fades in the direction you paged, and one
 * selection highlight travels between days (shared layoutId), so picking a date
 * reads as a single moving object rather than two cells swapping state.
 */
export function FullScreenCalendar({
  data,
  selectedDay: selectedDayProp,
  onSelectDay,
  headerSlot,
  minDate,
  eventsPerDay = 3,
  className,
}: FullScreenCalendarProps) {
  const today = startOfToday();
  const [internalDay, setInternalDay] = React.useState(today);
  const selectedDay = selectedDayProp ?? internalDay;

  const [currentMonth, setCurrentMonth] = React.useState(() =>
    format(selectedDayProp ?? today, "MMM-yyyy"),
  );
  const [direction, setDirection] = React.useState(1);

  // A controlled selection drives the view, so a parent can send the calendar to
  // a date in another month. Adjusted during render rather than in an effect, so
  // the grid never paints the old month first.
  const selectedMonthKey = selectedDayProp ? format(selectedDayProp, "MMM-yyyy") : null;
  const [lastSelectedMonth, setLastSelectedMonth] = React.useState(selectedMonthKey);
  if (selectedMonthKey && selectedMonthKey !== lastSelectedMonth) {
    setLastSelectedMonth(selectedMonthKey);
    if (selectedMonthKey !== currentMonth) {
      const next = startOfMonth(parse(selectedMonthKey, "MMM-yyyy", new Date()));
      const current = startOfMonth(parse(currentMonth, "MMM-yyyy", new Date()));
      setDirection(next > current ? 1 : -1);
      setCurrentMonth(selectedMonthKey);
    }
  }

  // parse fills the fields the format does not carry from the reference date,
  // so flatten it to the first midnight of the month.
  const firstDayCurrentMonth = startOfMonth(parse(currentMonth, "MMM-yyyy", new Date()));

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth, WEEK),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth), WEEK),
  });
  const weeks = days.length / 7;

  const floor = minDate ? startOfMonth(minDate) : null;
  const atFloor = floor ? firstDayCurrentMonth <= floor : false;
  const earliest = minDate ? startOfDay(minDate) : null;

  function selectDay(day: Date) {
    setInternalDay(day);
    onSelectDay?.(day);
  }

  function shiftMonth(step: number) {
    setDirection(step);
    setCurrentMonth(format(add(firstDayCurrentMonth, { months: step }), "MMM-yyyy"));
  }

  function goToToday() {
    const target = format(today, "MMM-yyyy");
    if (target !== currentMonth) {
      setDirection(today > firstDayCurrentMonth ? 1 : -1);
      setCurrentMonth(target);
    }
    selectDay(today);
  }

  function eventsOn(day: Date) {
    return data.find((entry) => isSameDay(entry.day, day))?.events ?? [];
  }

  const monthLabel = format(firstDayCurrentMonth, "MMMM yyyy");

  return (
    <div className={cn("flex flex-1 flex-col", className)}>
      {/* Header */}
      <div className="flex flex-col gap-5 pb-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={atFloor}
              aria-label="Previous month"
              className={navButton}
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className={navButton}
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </div>

          <div className="relative h-9 w-[11rem] overflow-hidden md:w-[13rem]">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.h2
                key={monthLabel}
                custom={direction}
                initial={{ opacity: 0, y: direction * 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -14 }}
                transition={{ duration: 0.28, ease }}
                aria-live="polite"
                className="absolute inset-0 text-[1.625rem] leading-9 font-semibold tracking-[-0.03em] whitespace-nowrap text-ink md:text-[1.875rem]"
              >
                {monthLabel}
              </motion.h2>
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={goToToday}
            className="ml-1 h-10 rounded-full border border-border bg-surface px-4 text-[0.875rem] font-medium text-ink transition-colors duration-200 hover:border-ink-faint"
          >
            Today
          </button>
        </div>

        {headerSlot}
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 pb-2 text-center text-[0.75rem] font-medium tracking-[0.08em] text-ink-faint uppercase">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 1)}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={currentMonth}
          custom={direction}
          initial={{ opacity: 0, x: direction * 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -28 }}
          transition={{ duration: 0.26, ease }}
        >
          {/* Desktop grid */}
          <div
            className="hidden gap-px overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-border-soft lg:grid lg:grid-cols-7"
            style={{ gridTemplateRows: `repeat(${weeks}, minmax(9rem, 1fr))` }}
          >
            {days.map((day) => {
              const events = eventsOn(day);
              const inMonth = isSameMonth(day, firstDayCurrentMonth);
              const isSelected = isEqual(day, selectedDay);
              const past = earliest ? isBefore(day, earliest) : false;
              const weekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={past}
                  onClick={() => selectDay(day)}
                  aria-pressed={isSelected}
                  aria-label={`${format(day, "EEEE d MMMM")}, ${events.length} ${
                    events.length === 1 ? "course" : "courses"
                  }`}
                  className={cn(
                    "group/day relative flex flex-col p-2.5 text-left transition-colors duration-200 disabled:cursor-default",
                    inMonth && !past ? (weekend ? "bg-bg/60" : "bg-surface") : "bg-bg",
                    !isSelected && !past && "hover:bg-tint/60",
                  )}
                >
                  {isSelected ? (
                    <motion.span
                      layoutId="day-selected-lg"
                      aria-hidden="true"
                      transition={{ duration: 0.3, ease }}
                      className="absolute inset-1 rounded-xl bg-surface shadow-[0_10px_28px_-10px_rgb(15_23_42/0.35)] ring-2 ring-ink"
                    />
                  ) : null}

                  <span
                    className={cn(
                      "figure relative grid size-7 shrink-0 place-items-center rounded-full text-[0.8125rem]",
                      isToday(day) && "bg-accent font-semibold text-on-accent",
                      isSelected && !isToday(day) && "bg-ink font-semibold text-bg",
                      !isToday(day) && !isSelected && inMonth && !past && "font-medium text-ink",
                      !isToday(day) && (!inMonth || past) && "text-ink-faint/70",
                    )}
                  >
                    <time dateTime={format(day, "yyyy-MM-dd")}>{format(day, "d")}</time>
                  </span>

                  {events.length > 0 && !past ? (
                    <span className="relative mt-2.5 flex w-full flex-col gap-1.5">
                      {events.slice(0, eventsPerDay).map((event) => {
                        const live = Boolean(event.colour) && !event.unavailable;
                        const rich = events.length <= 2;
                        return (
                          <span
                            key={event.id}
                            title={`${event.name}, ${event.time}${event.meta ? `, ${event.meta}` : ""}${event.unavailable ? ", fully booked" : ""}`}
                            style={
                              live
                                ? {
                                    backgroundColor: `color-mix(in oklab, ${event.colour} 10%, var(--surface))`,
                                    ["--chip" as string]: event.colour,
                                  }
                                : undefined
                            }
                            className={cn(
                              "relative flex min-w-0 flex-col justify-center overflow-hidden rounded-lg py-1.5 pr-2 pl-3 leading-tight transition-transform duration-200 ease-out group-hover/day:translate-x-0.5",
                              !live && "bg-tint",
                              event.unavailable && "opacity-70",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              style={{ backgroundColor: live ? event.colour : "var(--ink-faint)" }}
                              className="absolute inset-y-1.5 left-1 w-[3px] rounded-full"
                            />
                            <span
                              className={cn(
                                "truncate text-[0.78rem] font-semibold",
                                event.unavailable ? "text-ink-muted line-through decoration-ink-faint" : "text-ink",
                              )}
                            >
                              {event.name}
                            </span>
                            {rich ? (
                              <span className="figure mt-0.5 truncate text-[0.7rem] text-ink-muted">
                                {event.time.split(" to ")[0]}
                                {event.meta ? `  ${event.meta}` : ""}
                                {event.unavailable ? "  Full" : ""}
                              </span>
                            ) : null}
                          </span>
                        );
                      })}
                      {events.length > eventsPerDay ? (
                        <span className="figure px-1 pt-0.5 text-[0.72rem] font-medium text-ink-muted">
                          + {events.length - eventsPerDay} more
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Compact grid */}
          <div
            className="grid grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-border-soft lg:hidden"
            style={{ gridTemplateRows: `repeat(${weeks}, minmax(3.5rem, 1fr))` }}
          >
            {days.map((day) => {
              const events = eventsOn(day);
              const inMonth = isSameMonth(day, firstDayCurrentMonth);
              const isSelected = isEqual(day, selectedDay);
              const past = earliest ? isBefore(day, earliest) : false;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={past}
                  onClick={() => selectDay(day)}
                  aria-pressed={isSelected}
                  aria-label={`${format(day, "EEEE d MMMM")}, ${events.length} ${
                    events.length === 1 ? "course" : "courses"
                  }`}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 px-1 py-2 transition-colors duration-200 disabled:cursor-default",
                    inMonth && !past ? "bg-surface" : "bg-bg",
                  )}
                >
                  {isSelected ? (
                    <motion.span
                      layoutId="day-selected-sm"
                      aria-hidden="true"
                      transition={{ duration: 0.3, ease }}
                      className="absolute inset-1 rounded-xl bg-surface shadow-[0_10px_28px_-10px_rgb(15_23_42/0.35)] ring-2 ring-ink"
                    />
                  ) : null}

                  <span
                    className={cn(
                      "figure relative grid size-7 place-items-center rounded-full text-[0.875rem]",
                      isToday(day) && "bg-accent font-semibold text-on-accent",
                      isSelected && !isToday(day) && "bg-ink font-semibold text-bg",
                      !isToday(day) && !isSelected && inMonth && !past && "font-medium text-ink",
                      !isToday(day) && (!inMonth || past) && "text-ink-faint/70",
                    )}
                  >
                    <time dateTime={format(day, "yyyy-MM-dd")}>{format(day, "d")}</time>
                  </span>

                  <span aria-hidden="true" className="relative flex h-1.5 items-center gap-0.5">
                    {past
                      ? null
                      : events.slice(0, 3).map((event) => (
                          <span
                            key={event.id}
                            style={
                              event.colour && !event.unavailable
                                ? { backgroundColor: event.colour }
                                : undefined
                            }
                            className={cn(
                              "size-1.5 rounded-full",
                              event.unavailable ? "bg-ink-faint" : "bg-accent",
                            )}
                          />
                        ))}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
