import "server-only";
import { randomBytes } from "node:crypto";
import type { Course, ExtraSession } from "@/lib/content";
import { clock, euro, invalid, isoDay, money, wholeNumber } from "@/lib/admin/validate.server";
import { singleLine } from "@/lib/validate.server";
import { DEFAULT_VENUE } from "@/lib/schedule";
import { courseLinks } from "@/lib/blended/feed.server";

/**
 * Course dates as staff enter them: checked here, for both adding and editing.
 */

export const MAX_PLACES = 200;
export const MAX_DAYS = 10;

/**
 * Courses Pulse 8 runs and prices itself: classroom and blended delivery
 * alike, but not online ones (sold on Videotile) and not ones linked to the
 * Blended Learning app, whose prices and practical days are set in BL.
 */
export function ownCourses(courses: Course[]): Course[] {
  const linked = new Set([...courseLinks(courses).values()].map((link) => link.slug));
  return courses.filter((course) => course.delivery !== "Online" && !linked.has(course.slug));
}

/** Courses a date can be added for: the same as `ownCourses`. */
export const datableCourses = ownCourses;

export function newDateId(day: string): string {
  return `date-${day.replaceAll("-", "")}-${randomBytes(3).toString("hex")}`;
}

type Result = { ok: true; date: ExtraSession } | { ok: false; error: string };

/**
 * Applies `input` on top of `base` (an existing date, or defaults for a new
 * one) and checks the result. Only fields present in `input` change.
 */
export function applyDateInput(base: ExtraSession, input: Record<string, unknown>, courses: Course[]): Result {
  const next: ExtraSession = { ...base };
  const has = (key: string) => Object.hasOwn(input, key);

  if (has("courseSlug")) {
    const course = datableCourses(courses).find((item) => item.slug === input.courseSlug);
    if (!course) return { ok: false, error: "Choose one of the courses Pulse 8 runs." };
    next.courseSlug = course.slug;
  }
  if (has("date")) {
    const day = isoDay(input.date);
    if (!day) return { ok: false, error: "Enter a valid date." };
    next.date = day;
  }
  if (has("start")) {
    const start = clock(input.start);
    if (!start) return { ok: false, error: "Enter a start time like 09:30." };
    next.start = start;
  }
  if (has("end")) {
    if (input.end === "" || input.end === null) delete next.end;
    else {
      const end = clock(input.end);
      if (!end) return { ok: false, error: "Enter an end time like 17:00, or leave it blank." };
      next.end = end;
    }
  }
  if (has("days")) {
    const days = wholeNumber(input.days, 1, MAX_DAYS);
    if (days === null) return { ok: false, error: `Days must be between 1 and ${MAX_DAYS}.` };
    next.days = days;
  }
  if (has("seatsLeft")) {
    const places = wholeNumber(input.seatsLeft, 0, MAX_PLACES);
    if (places === null) return { ok: false, error: `Places must be a whole number from 0 to ${MAX_PLACES}.` };
    next.seatsLeft = places;
  }
  if (has("online")) next.online = input.online === true;
  if (has("venue")) {
    const venue = singleLine(input.venue ?? "", 120);
    if (venue === null) return { ok: false, error: "The venue is too long (120 characters at most)." };
    if (venue && venue !== DEFAULT_VENUE) next.venue = venue;
    else delete next.venue;
  }
  if (has("priceOverride")) {
    const price = euro(input.priceOverride);
    if (price === invalid) return { ok: false, error: "Enter the date's price in euro, or leave it blank to use the course price." };
    if (price === null) delete next.priceOverride;
    else next.priceOverride = price;
  }
  if (has("note")) {
    const note = singleLine(input.note ?? "", 200);
    if (note === null) return { ok: false, error: "The note is too long (200 characters at most)." };
    if (note) next.note = note;
    else delete next.note;
  }
  if (has("closed")) {
    if (input.closed === true) next.closed = true;
    else delete next.closed;
  }

  if (next.end && next.days === 1 && next.end <= next.start) {
    return { ok: false, error: "The end time must be after the start time." };
  }
  return { ok: true, date: next };
}

/** "Cardiac First Response, Tue 3 Feb 2027 09:30" for the activity log. */
export function describeDate(date: ExtraSession, courses: Course[]): string {
  const title = courses.find((course) => course.slug === date.courseSlug)?.title ?? date.courseSlug;
  const day = new Date(`${date.date}T00:00:00Z`).toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${title}, ${day} ${date.start}`;
}

const LABELS: Array<[keyof ExtraSession, string, (value: unknown) => string]> = [
  ["courseSlug", "course", String],
  ["date", "date", String],
  ["start", "start", String],
  ["end", "end", (value) => (value ? String(value) : "automatic")],
  ["days", "days", String],
  ["seatsLeft", "places", String],
  ["venue", "venue", (value) => (value ? String(value) : DEFAULT_VENUE)],
  ["online", "online", (value) => (value ? "yes" : "no")],
  ["priceOverride", "price", (value) => (typeof value === "number" ? money(value) : "course price")],
  ["note", "note", (value) => (value ? `“${value}”` : "none")],
];

export function describeChanges(before: ExtraSession, after: ExtraSession): string[] {
  return LABELS.filter(([key]) => before[key] !== after[key]).map(
    ([key, label, show]) => `${label} ${show(before[key])} → ${show(after[key])}`,
  );
}
