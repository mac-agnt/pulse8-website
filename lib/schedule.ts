import { courses, type Course, type Delivery } from "@/lib/data";
import type { ExtraSession } from "@/lib/content";

/**
 * Course schedule.
 *
 * PLACEHOLDER DATA. Pulse 8 has no public dates feed, so this builds a
 * plausible rolling schedule from the real course list: real titles, real
 * durations, real class sizes, generated dates and seat counts. It is
 * deterministic for a given anchor date, so the server and the client agree.
 *
 * To go live, replace `buildSchedule` with a fetch against the booking system
 * and keep the `Session` shape. Nothing else on the page needs to change.
 */

export type Venue = "Pulse 8 Training Centre, Dublin" | "Live online";

export type Session = {
  id: string;
  courseSlug: string;
  title: string;
  delivery: Delivery;
  certificate?: string;
  /** euro, per person */
  price: number;
  duration: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM, 24 hour */
  start: string;
  end: string;
  /** consecutive days the course runs for */
  days: number;
  venue: Venue;
  capacity: number;
  seatsLeft: number;
};

const HORIZON_DAYS = 120;
const MS_DAY = 86_400_000;

/**
 * Park–Miller. Deterministic, good enough to scatter seat counts.
 *
 * Small seeds produce a small first output, which had every course opening on a
 * fully booked date. The seed is mixed and the first values discarded.
 */
function seeded(seed: number) {
  let state = (seed * 2_654_435_761) % 2_147_483_647;
  if (state <= 0) state += 2_147_483_646;
  const next = () => {
    state = (state * 16_807) % 2_147_483_647;
    return state / 2_147_483_647;
  };
  for (let i = 0; i < 8; i += 1) next();
  return next;
}

/** "18 hours", "150 minutes" and "3 to 6 hours" all resolve to a number of hours. */
function hoursFor(course: Course): number {
  const value = course.duration.toLowerCase();
  const first = Number.parseFloat(value.replace(/[^0-9.]+/g, " ").trim().split(/\s+/)[0] ?? "");
  if (!Number.isFinite(first)) return 3;
  return value.includes("minute") ? first / 60 : first;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Local midnight for an ISO day. The calendar compares days with date-fns,
 * which works in local time, so ISO days have to enter it that way rather than
 * through `new Date(iso)`, which parses as UTC and can land a day out.
 */
export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function addMonths(monthIso: string, step: number): string {
  const [y, m] = monthIso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + step, 1));
  return isoDate(date).slice(0, 7);
}

/** Sunday-start weeks. A trailing week that falls entirely outside the month is dropped. */
export function monthGrid(monthIso: string): string[] {
  const [y, m] = monthIso.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(first.getTime() - first.getUTCDay() * MS_DAY);
  const days = Array.from({ length: 42 }, (_, i) =>
    isoDate(new Date(start.getTime() + i * MS_DAY)),
  );
  return days.slice(-7).some((day) => day.startsWith(monthIso)) ? days : days.slice(0, 35);
}

export function formatDayLong(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function formatDayShort(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function addDays(iso: string, step: number): string {
  return isoDate(new Date(new Date(`${iso}T00:00:00Z`).getTime() + step * MS_DAY));
}

export function formatPrice(euro: number): string {
  return `\u20ac${euro}`;
}

export function formatMonth(monthIso: string): string {
  return new Date(`${monthIso}-01T00:00:00Z`).toLocaleDateString("en-IE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Each course gets a cadence, so the calendar reads like a real timetable: the
 * headline courses run twice a week, the short online and blended ones almost
 * daily, the long classroom ones every fortnight or so.
 */
function cadenceFor(course: Course, index: number): number {
  if (course.headline) return 4;
  if (course.delivery === "Online") return 5;
  if (course.delivery === "Blended") return 7;
  return index % 2 === 0 ? 9 : 11;
}

/**
 * The times a course runs on one of its dates. Anything under four hours runs
 * twice in the day, which is how the short refreshers actually sell.
 */
function slotsFor(hours: number, index: number): Array<{ start: string; days: number }> {
  if (hours >= 7) return [{ start: "09:00", days: Math.ceil(hours / 7) }];
  if (hours >= 4) return [{ start: "09:00", days: 1 }];
  if (hours >= 2) {
    return index % 2 === 0
      ? [{ start: "09:30", days: 1 }, { start: "14:00", days: 1 }]
      : [{ start: "10:00", days: 1 }, { start: "18:30", days: 1 }];
  }
  return [{ start: "12:30", days: 1 }, { start: "18:30", days: 1 }];
}

export function buildSchedule(anchor: Date): Session[] {
  const from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const sessions: Session[] = [];

  courses.forEach((course, index) => {
    const hours = hoursFor(course);
    const slots = slotsFor(hours, index);
    const cadence = cadenceFor(course, index);
    const capacity = course.maxParticipants ?? 12;
    const random = seeded(index * 977 + 31);
    // Scattered rather than stepped, so courses do not all land on the same
    // few days and leave the rest of the week thin.
    const offset = Math.floor(random() * cadence);

    for (let day = 0; day < HORIZON_DAYS; day += 1) {
      if (day % cadence !== offset) continue;

      const date = new Date(from.getTime() + day * MS_DAY);
      const weekday = date.getUTCDay();
      if (weekday === 0 || weekday === 6) continue;

      slots.forEach(({ start, days }) => {
        const end = days > 1 ? "17:00" : toTime(toMinutes(start) + hours * 60);
        const roll = random();

        sessions.push({
          id: `${course.slug}-${isoDate(date)}-${start}`,
          courseSlug: course.slug,
          title: course.title,
          delivery: course.delivery,
          certificate: course.certificate,
          price: course.price,
          duration: course.duration,
          date: isoDate(date),
          start,
          end,
          days,
          venue:
            course.delivery === "Online" ? "Live online" : "Pulse 8 Training Centre, Dublin",
          capacity,
          // Most dates have room. A few are full, so that state is visible.
          seatsLeft: roll < 0.12 ? 0 : Math.max(1, Math.round(roll * capacity)),
        });
      });
    }
  });

  return sessions.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

/**
 * A date added by hand in the dashboard, expanded into the same shape the
 * generated schedule uses. Anything the editor did not set (title, price,
 * certificate, duration) is read off the course, so the two sources cannot
 * drift apart.
 */
export function expandExtraSessions(
  extras: ExtraSession[],
  courseList: Course[] = courses,
): Session[] {
  return extras.flatMap((extra) => {
    const course = courseList.find((item) => item.slug === extra.courseSlug);
    if (!course) return [];

    const hours = hoursFor(course);
    const days = Math.max(1, extra.days);
    const capacity = course.maxParticipants ?? 12;

    return [
      {
        id: extra.id,
        courseSlug: course.slug,
        title: course.title,
        delivery: extra.online ? "Online" : course.delivery,
        certificate: course.certificate,
        price: course.price,
        duration: course.duration,
        date: extra.date,
        start: extra.start,
        end: days > 1 ? "17:00" : toTime(toMinutes(extra.start) + hours * 60),
        days,
        venue: extra.online ? "Live online" : "Pulse 8 Training Centre, Dublin",
        capacity: Math.max(capacity, extra.seatsLeft),
        seatsLeft: extra.seatsLeft,
      },
    ];
  });
}

/** The generated schedule with the dashboard's dates merged in, in date order. */
export function mergeSessions(generated: Session[], extras: Session[]): Session[] {
  return [...generated, ...extras].sort((a, b) =>
    (a.date + a.start).localeCompare(b.date + b.start),
  );
}
