"use client";

import * as React from "react";
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  startOfToday,
  startOfWeek,
} from "date-fns";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { cn } from "@/lib/cn";

export interface CalendarEvent {
  id: string | number;
  name: string;
  /** "09:00 to 12:00" */
  time: string;
  /** ISO datetime, for the <time> element */
  datetime: string;
  /** short trailing detail, shown after the time. Price, on this build. */
  meta?: string;
  /** dims the chip and drops the accent marker */
  unavailable?: boolean;
  /** CSS colour for the chip's edge and tint. Categorical, set by the caller. */
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
  /** months before this one cannot be paged to. Past dates are not bookable. */
  minDate?: Date;
  /** event chips per desktop cell before the "+ n more" line */
  eventsPerDay?: number;
  className?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const navButton =
  "grid size-9 place-items-center border border-border bg-surface text-ink-muted transition-colors duration-200 hover:border-ink-faint hover:text-ink disabled:pointer-events-none disabled:opacity-40";

/**
 * Month calendar, sized to fill the page rather than sit in a card.
 *
 * Desktop draws every day as a cell with its events written out. Below lg the
 * same month collapses to a compact grid where each day carries a dot per
 * event, and the detail belongs to whatever the parent renders under it. Both
 * grids ship in the markup and are switched by CSS, so the first paint is
 * correct with no measuring.
 */
export function FullScreenCalendar({
  data,
  selectedDay: selectedDayProp,
  onSelectDay,
  headerSlot,
  minDate,
  eventsPerDay = 2,
  className,
}: FullScreenCalendarProps) {
  const today = startOfToday();
  const [internalDay, setInternalDay] = React.useState(today);
  const selectedDay = selectedDayProp ?? internalDay;

  const [currentMonth, setCurrentMonth] = React.useState(() =>
    format(selectedDayProp ?? today, "MMM-yyyy"),
  );
  // A controlled selection drives the view, so a parent can send the calendar to
  // a date in another month. Adjusted during render rather than in an effect, so
  // the grid never paints the old month first.
  const selectedMonthKey = selectedDayProp ? format(selectedDayProp, "MMM-yyyy") : null;
  const [lastSelectedMonth, setLastSelectedMonth] = React.useState(selectedMonthKey);
  if (selectedMonthKey && selectedMonthKey !== lastSelectedMonth) {
    setLastSelectedMonth(selectedMonthKey);
    setCurrentMonth(selectedMonthKey);
  }

  // parse fills the fields the format does not carry from the reference date,
  // so the result keeps today's time of day. Everything below compares dates,
  // so flatten it to the first midnight of the month.
  const firstDayCurrentMonth = startOfMonth(parse(currentMonth, "MMM-yyyy", new Date()));

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
  });
  const weeks = days.length / 7;

  const floor = minDate ? startOfMonth(minDate) : null;
  const atFloor = floor ? firstDayCurrentMonth <= floor : false;

  function selectDay(day: Date) {
    setInternalDay(day);
    onSelectDay?.(day);
  }

  function shiftMonth(step: number) {
    setCurrentMonth(format(add(firstDayCurrentMonth, { months: step }), "MMM-yyyy"));
  }

  function goToToday() {
    setCurrentMonth(format(today, "MMM-yyyy"));
    selectDay(today);
  }

  function eventsOn(day: Date) {
    return data.find((entry) => isSameDay(entry.day, day))?.events ?? [];
  }

  return (
    <div className={cn("flex flex-1 flex-col", className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="hidden w-16 flex-col items-center overflow-hidden rounded-[var(--radius-control)] border border-border bg-tint md:flex">
            <span className="py-1 text-[0.6875rem] font-medium tracking-[0.12em] text-ink-muted uppercase">
              {format(today, "MMM")}
            </span>
            <span className="figure w-full bg-surface py-1 text-center text-lg font-semibold text-ink">
              {format(today, "d")}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-ink">
              {format(firstDayCurrentMonth, "MMMM yyyy")}
            </h2>
            <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
              {format(firstDayCurrentMonth, "d MMM")} to{" "}
              {format(endOfMonth(firstDayCurrentMonth), "d MMM yyyy")}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
          {headerSlot}

          {headerSlot ? (
            <div
              role="separator"
              aria-orientation="vertical"
              className="hidden h-6 w-px bg-border md:block"
            />
          ) : null}

          <div className="inline-flex -space-x-px">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={atFloor}
              aria-label="Previous month"
              className={cn(navButton, "rounded-l-[var(--radius-control)]")}
            >
              <CaretLeft size={15} weight="bold" />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className={cn(
                navButton,
                "w-auto px-4 text-[0.875rem] font-medium text-ink",
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className={cn(navButton, "rounded-r-[var(--radius-control)]")}
            >
              <CaretRight size={15} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-t border-l border-border bg-tint text-center text-[0.75rem] font-medium tracking-[0.06em] text-ink-muted uppercase">
        {WEEKDAYS.map((day) => (
          <div key={day} className="border-r border-b border-border py-2.5">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 1)}</span>
          </div>
        ))}
      </div>

      {/* Desktop grid */}
      <div
        className="hidden border-l border-border lg:grid lg:flex-auto lg:grid-cols-7"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(9.75rem, 1fr))` }}
      >
        {days.map((day) => {
          const events = eventsOn(day);
          const inMonth = isSameMonth(day, firstDayCurrentMonth);
          const isSelected = isEqual(day, selectedDay);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => selectDay(day)}
              aria-pressed={isSelected}
              aria-label={`${format(day, "EEEE d MMMM")}, ${events.length} ${
                events.length === 1 ? "course" : "courses"
              }`}
              className={cn(
                "flex flex-col border-r border-b border-border p-2.5 text-left transition-colors duration-200",
                inMonth ? "bg-surface" : "bg-bg",
                isSelected ? "bg-tint" : "hover:bg-tint",
              )}
            >
              <span
                className={cn(
                  "figure grid size-7 shrink-0 place-items-center rounded-full text-[0.8125rem]",
                  isSelected && "bg-ink font-semibold text-bg",
                  !isSelected && isToday(day) && "bg-accent font-semibold text-on-accent",
                  !isSelected && !isToday(day) && inMonth && "text-ink",
                  !isSelected && !isToday(day) && !inMonth && "text-ink-faint",
                )}
              >
                <time dateTime={format(day, "yyyy-MM-dd")}>{format(day, "d")}</time>
              </span>

              {events.length > 0 ? (
                <div className="mt-2.5 flex w-full flex-col gap-1.5">
                  {events.slice(0, eventsPerDay).map((event) => (
                    <span
                      key={event.id}
                      style={
                        event.colour
                          ? {
                              borderLeftColor: event.colour,
                              backgroundColor: `color-mix(in oklab, ${event.colour} 7%, var(--surface))`,
                            }
                          : undefined
                      }
                      className={cn(
                        "flex flex-col gap-0.5 rounded-[8px] border border-border-soft border-l-[3px] bg-bg px-2.5 py-2 text-[0.75rem] leading-tight",
                        event.unavailable && "opacity-70",
                      )}
                    >
                      <span className="truncate font-medium text-ink">{event.name}</span>
                      <span className="figure truncate text-ink-muted">
                        {event.time}
                        {event.meta ? ` · ${event.meta}` : ""}
                      </span>
                    </span>
                  ))}
                  {events.length > eventsPerDay ? (
                    <span className="figure px-1 pt-0.5 text-[0.75rem] text-ink-muted">
                      + {events.length - eventsPerDay} more
                    </span>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Compact grid */}
      <div
        className="grid grid-cols-7 border-l border-border lg:hidden"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(3.5rem, 1fr))` }}
      >
        {days.map((day) => {
          const events = eventsOn(day);
          const inMonth = isSameMonth(day, firstDayCurrentMonth);
          const isSelected = isEqual(day, selectedDay);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => selectDay(day)}
              aria-pressed={isSelected}
              aria-label={`${format(day, "EEEE d MMMM")}, ${events.length} ${
                events.length === 1 ? "course" : "courses"
              }`}
              className={cn(
                "flex flex-col items-center justify-center gap-1 border-r border-b border-border px-1 py-2 transition-colors duration-200",
                inMonth ? "bg-surface" : "bg-bg",
                isSelected ? "bg-tint" : "hover:bg-tint",
              )}
            >
              <span
                className={cn(
                  "figure grid size-7 place-items-center rounded-full text-[0.875rem]",
                  isSelected && "bg-ink font-semibold text-bg",
                  !isSelected && isToday(day) && "bg-accent font-semibold text-on-accent",
                  !isSelected && !isToday(day) && inMonth && "text-ink",
                  !isSelected && !isToday(day) && !inMonth && "text-ink-faint",
                )}
              >
                <time dateTime={format(day, "yyyy-MM-dd")}>{format(day, "d")}</time>
              </span>

              <span aria-hidden="true" className="flex h-1.5 items-center gap-0.5">
                {events.slice(0, 3).map((event) => (
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
    </div>
  );
}
