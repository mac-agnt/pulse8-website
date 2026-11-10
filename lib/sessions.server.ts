import "server-only";
import { readContent } from "@/lib/content.server";
import { paymentConfig } from "@/lib/booking/config.server";
import { seatsTakenBySession } from "@/lib/booking/store.server";
import { isPublished, type Course } from "@/lib/data";
import {
  buildSchedule,
  compareSessions,
  expandExtraSessions,
  isUpcoming,
  mergeSessions,
  type PublicSession,
  type Session,
} from "@/lib/schedule";

/**
 * The one place public pages get dates from.
 *
 * Published dates are the ones Pulse 8 enters in the dashboard. The generated
 * fixture timetable is added only where fixtures are on: by default in
 * development, never in a production build unless SCHEDULE_FIXTURES=1 is set
 * deliberately (for a staging demo). Fixture dates are labelled as samples and
 * never offer booking.
 */
export function fixturesEnabled(): boolean {
  if (process.env.SCHEDULE_FIXTURES === "1") return true;
  if (process.env.SCHEDULE_FIXTURES === "0") return false;
  return process.env.NODE_ENV !== "production";
}

/** Every session the server knows about, fixtures included when on, rates excluded. */
async function allSessions(courses: Course[], extras: Parameters<typeof expandExtraSessions>[0], now: Date) {
  const published = expandExtraSessions(extras, courses);
  return fixturesEnabled() ? mergeSessions(buildSchedule(now, courses), published) : published;
}

function actionFor(session: Session, course: Course | undefined, canPay: boolean): PublicSession["action"] {
  if (session.sample || session.seatsLeft <= 0) return "enquire";
  if (!canPay || !course || typeof course.price !== "number" || course.price <= 0) return "enquire";
  return "book";
}

/**
 * Upcoming sessions for public pages: published courses only, Dublin-time
 * upcoming, availability net of online bookings and live holds, sorted by
 * start, and each with its next step decided here rather than in the browser.
 */
export async function getPublicSessions(now: Date = new Date()): Promise<PublicSession[]> {
  const content = await readContent();
  const courses = content.courses.filter(isPublished);
  const bySlug = new Map(courses.map((course) => [course.slug, course]));
  const canPay = paymentConfig() !== null;

  const [sessions, taken] = await Promise.all([
    allSessions(courses, content.extraSessions, now),
    seatsTakenBySession(now.getTime()).catch(() => new Map<string, number>()),
  ]);

  return sessions
    .filter((session) => bySlug.has(session.courseSlug) && isUpcoming(session, now))
    .map((session) => {
      const seatsLeft = Math.max(0, session.seatsLeft - (taken.get(session.id) ?? 0));
      const next = { ...session, seatsLeft };
      return { ...next, action: actionFor(next, bySlug.get(session.courseSlug), canPay) };
    })
    .sort(compareSessions);
}

/**
 * One session, for the booking API. Includes the server-side rate, and the
 * seats Pulse 8 released before any online bookings, which is what holds are
 * counted against.
 */
export async function getBookableSession(
  sessionId: string,
  now: Date = new Date(),
): Promise<{ session: Session; course: Course; unitAmountCents: number } | null> {
  const content = await readContent();
  const courses = content.courses.filter(isPublished);
  // Fixtures are never bookable, so only published dates are considered.
  const session = expandExtraSessions(content.extraSessions, courses).find(
    (item) => item.id === sessionId,
  );
  if (!session || session.sample || !isUpcoming(session, now)) return null;

  const course = courses.find((item) => item.slug === session.courseSlug);
  if (!course || typeof course.price !== "number" || course.price <= 0) return null;

  return { session, course, unitAmountCents: Math.round(course.price * 100) };
}

/** Seats released for a published session, or null if it is no longer published. */
export async function releasedSeats(sessionId: string): Promise<number | null> {
  const content = await readContent();
  const courses = content.courses.filter(isPublished);
  const session = expandExtraSessions(content.extraSessions, courses).find(
    (item) => item.id === sessionId,
  );
  return session ? session.seatsLeft : null;
}
