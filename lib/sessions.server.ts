import "server-only";
import { readContent, readContentForDisplay } from "@/lib/content.server";
import { paymentConfig } from "@/lib/booking/config.server";
import { seatsTakenBySession } from "@/lib/booking/store.server";
import { blendedCatalogue } from "@/lib/blended/feed.server";
import { BLENDED_SESSION_PREFIX, type BlendedSession } from "@/lib/blended/map";
import { isPublished, type Course } from "@/lib/data";
import type { ExtraSession } from "@/lib/content";
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
 * Published dates are the ones Pulse 8 enters in the dashboard, plus the
 * practical days Pulse 8 Blended Learning publishes for its courses (ids
 * `bl_<BL session id>`, read from BL's course list, see
 * lib/blended/feed.server.ts). The generated fixture timetable is added only
 * where fixtures are on: by default in development, never in a production
 * build unless SCHEDULE_FIXTURES=1 is set deliberately (for a staging demo).
 * Fixture dates are labelled as samples and never offer booking.
 */
export function fixturesEnabled(): boolean {
  if (process.env.SCHEDULE_FIXTURES === "1") return true;
  if (process.env.SCHEDULE_FIXTURES === "0") return false;
  return process.env.NODE_ENV !== "production";
}

export function isBlendedSessionId(sessionId: string): boolean {
  return sessionId.startsWith(BLENDED_SESSION_PREFIX);
}

/** Every session the server knows about, fixtures included when on, rates excluded. */
async function allSessions(courses: Course[], extras: Parameters<typeof expandExtraSessions>[0], now: Date) {
  const published = expandExtraSessions(extras, courses);
  return fixturesEnabled() ? mergeSessions(buildSchedule(now, courses), published) : published;
}

function actionFor(session: Session, unitAmountCents: number | null, canPay: boolean): PublicSession["action"] {
  if (session.sample || session.seatsLeft <= 0) return "enquire";
  if (!canPay || unitAmountCents === null || unitAmountCents <= 0) return "enquire";
  return "book";
}

/**
 * Cents per person for one of Pulse 8's own dates: the date's own price when
 * staff set one, otherwise the course price. Null means no online booking.
 */
function rateCents(course: Course | undefined, extra?: ExtraSession): number | null {
  if (!course) return null;
  const override = extra?.priceOverride;
  const euro = typeof override === "number" && override > 0 ? override : course.price;
  return typeof euro === "number" && euro > 0 ? Math.round(euro * 100) : null;
}

/** A BL day as a plain session: BL's own id stays server-side. */
function asSession({ blSessionId: _id, ...session }: BlendedSession): Session {
  void _id;
  return session;
}

/**
 * Upcoming sessions for public pages: published courses only, Dublin-time
 * upcoming, availability net of online bookings and live holds, sorted by
 * start, and each with its next step decided here rather than in the browser.
 */
export async function getPublicSessions(now: Date = new Date()): Promise<PublicSession[]> {
  const content = await readContentForDisplay();
  const courses = content.courses.filter(isPublished);
  const bySlug = new Map(courses.map((course) => [course.slug, course]));
  const canPay = paymentConfig() !== null;

  const [sessions, taken, catalogue] = await Promise.all([
    allSessions(courses, content.extraSessions, now),
    seatsTakenBySession(now.getTime()).catch(() => new Map<string, number>()),
    blendedCatalogue(courses),
  ]);

  const extras = new Map(content.extraSessions.map((extra) => [extra.id, extra]));
  const own = sessions
    .filter((session) => bySlug.has(session.courseSlug))
    .map((session) => ({ session, cents: rateCents(bySlug.get(session.courseSlug), extras.get(session.id)) }));
  // BL days are priced by BL, linked website course or not.
  const blended = catalogue.ok
    ? catalogue.courses.flatMap((course) =>
        course.sessions.map((day) => ({ session: asSession(day), cents: course.priceCents })),
      )
    : [];

  return [...own, ...blended]
    .filter(({ session }) => isUpcoming(session, now))
    .map(({ session, cents }) => {
      const seatsLeft = Math.max(0, session.seatsLeft - (taken.get(session.id) ?? 0));
      const next = { ...session, seatsLeft };
      return { ...next, action: actionFor(next, cents, canPay) };
    })
    .sort(compareSessions);
}

export type BookableSession = {
  session: Session;
  course: Course;
  unitAmountCents: number;
  /** set for a Blended Learning practical day */
  blended?: { courseId: string; courseSlug: string; sessionId: string };
};

/**
 * One session, for the booking API. Includes the server-side rate, and the
 * seats Pulse 8 released before any online bookings, which is what holds are
 * counted against. A Blended Learning day is read fresh from BL, so the price
 * and its places are current at the moment of checkout.
 */
export async function getBookableSession(sessionId: string, now: Date = new Date()): Promise<BookableSession | null> {
  const content = await readContent();
  const courses = content.courses.filter(isPublished);

  if (isBlendedSessionId(sessionId)) {
    const catalogue = await blendedCatalogue(courses, { fresh: true });
    if (!catalogue.ok) return null;
    for (const item of catalogue.courses) {
      const day = item.sessions.find((session) => session.id === sessionId);
      if (!day) continue;
      if (!isUpcoming(day, now) || item.priceCents === null) return null;
      const course = item.linked ? courses.find((c) => c.slug === item.slug) : item.course;
      if (!course) return null;
      return {
        session: asSession(day),
        course,
        unitAmountCents: item.priceCents,
        blended: { courseId: item.id, courseSlug: item.blSlug, sessionId: day.blSessionId },
      };
    }
    return null;
  }

  // Fixtures are never bookable, so only published dates are considered.
  const session = expandExtraSessions(content.extraSessions, courses).find(
    (item) => item.id === sessionId,
  );
  if (!session || session.sample || !isUpcoming(session, now)) return null;

  const course = courses.find((item) => item.slug === session.courseSlug);
  const cents = rateCents(course, content.extraSessions.find((extra) => extra.id === sessionId));
  if (!course || cents === null) return null;

  return { session, course, unitAmountCents: cents };
}

/** Seats released for a published session, or null if it is no longer published. */
export async function releasedSeats(sessionId: string): Promise<number | null> {
  const content = await readContent();
  const courses = content.courses.filter(isPublished);

  if (isBlendedSessionId(sessionId)) {
    const catalogue = await blendedCatalogue(courses, { fresh: true });
    // BL unreachable while a payment lands: confirm it. BL accepts a paid
    // booking even onto a full day and shows staff the day as over capacity,
    // so the customer is never left paid but unbooked.
    if (!catalogue.ok) return Number.MAX_SAFE_INTEGER;
    const day = catalogue.courses.flatMap((course) => course.sessions).find((item) => item.id === sessionId);
    return day ? day.seatsLeft : null;
  }

  // A date closed while someone was paying still counts: their booking lands.
  const session = expandExtraSessions(content.extraSessions, courses, { includeClosed: true }).find(
    (item) => item.id === sessionId,
  );
  return session ? session.seatsLeft : null;
}
