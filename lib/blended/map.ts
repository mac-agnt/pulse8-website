import type { Course } from "@/lib/data";
import type { Session } from "@/lib/schedule";

/**
 * Pulse 8 Blended Learning's course list, turned into this site's courses and
 * dates. Pure: no fetching, no clock beyond what is passed in, no framework
 * imports (the unit tests in scripts/unit load it directly), and it never
 * throws on a bad course or day inside an otherwise valid list; it skips it.
 *
 * Contract: BL's docs/website-integration.md, v2 (signed list carries price).
 */

export type FeedPrice = { amount_cents: number; currency: string } | null;

export type FeedDay = {
  session_id: string;
  starts_at: string;
  ends_at: string;
  venue_name: string;
  venue_address?: string | null;
  capacity: number;
  places_left: number;
};

export type FeedCourse = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  description?: string | null;
  image_url?: string | null;
  delivery: "blended" | "online" | string;
  length_label?: string | null;
  certificate?: { name: string; valid_for_months?: number | null; accrediting_body?: string | null } | null;
  practical_days?: FeedDay[];
  /** only on a signed read */
  price?: FeedPrice;
};

/** A BL practical day as a website session. */
export type BlendedSession = Session & {
  /** BL's own id for the day (the website id is `bl_<this>`) */
  blSessionId: string;
};

export type BlendedCourse = {
  /** BL course id: the key */
  id: string;
  /** BL course slug, as BL's booking API wants it */
  blSlug: string;
  /** true when a website course carries this id and keeps its own page */
  linked: boolean;
  /** the website slug the course and its dates live under */
  slug: string;
  /** cents, euro. null: no price set, or an unsigned read. Server only. */
  priceCents: number | null;
  /** the course as this site shows it. Never carries a price. */
  course: Course;
  sessions: BlendedSession[];
};

export class FeedError extends Error {}

export const BLENDED_SESSION_PREFIX = "bl_";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Wall-clock date and time in Ireland for an instant. */
export function dublinParts(instant: Date): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Dublin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function dayCount(fromIso: string, toIso: string): number {
  const days = Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
  return Math.max(1, days + 1);
}

/** Euro cents, or null for anything else (no price, zero, another currency, nonsense). */
export function parsePrice(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const { amount_cents: cents, currency } = value as { amount_cents?: unknown; currency?: unknown };
  if (typeof currency !== "string" || currency.toLowerCase() !== "eur") return null;
  if (typeof cents !== "number" || !Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}

function paragraphs(value: unknown): string[] {
  const body = typeof value === "string" ? value : "";
  return body
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .slice(0, 20);
}

function validity(months: unknown): string | undefined {
  if (typeof months !== "number" || !Number.isInteger(months) || months <= 0) return undefined;
  if (months % 12 === 0) return months === 12 ? "1 year" : `${months / 12} years`;
  return months === 1 ? "1 month" : `${months} months`;
}

/**
 * BL's course pictures live in its Supabase storage. Only that host is allowed
 * (next.config.ts lists it for next/image); any other picture is dropped and
 * the course shows the neutral panel, so a bad URL can never break a page.
 */
export function imageUrl(value: unknown): string | undefined {
  const raw = text(value, 2000);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const allowed =
      url.protocol === "https:" &&
      url.hostname.endsWith(".supabase.co") &&
      url.pathname.startsWith("/storage/v1/object/public/");
    return allowed ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function mapDay(day: unknown, course: { slug: string; title: string; certificate?: string; duration?: string }): BlendedSession | null {
  if (!day || typeof day !== "object") return null;
  const value = day as Partial<FeedDay>;
  const id = text(value.session_id, 150);
  const venueName = text(value.venue_name, 200);
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id) || !venueName) return null;

  const starts = new Date(String(value.starts_at));
  const ends = new Date(String(value.ends_at));
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends <= starts) return null;

  const capacity = value.capacity;
  const left = value.places_left;
  if (typeof capacity !== "number" || !Number.isInteger(capacity) || capacity < 0) return null;
  if (typeof left !== "number" || !Number.isInteger(left)) return null;

  const start = dublinParts(starts);
  const end = dublinParts(ends);
  const address = text(value.venue_address, 300);

  return {
    id: `${BLENDED_SESSION_PREFIX}${id}`,
    blSessionId: id,
    courseSlug: course.slug,
    title: course.title,
    delivery: "Blended",
    certificate: course.certificate,
    duration: course.duration,
    date: start.date,
    start: start.time,
    end: end.time,
    days: dayCount(start.date, end.date),
    venue: address ? `${venueName}, ${address}` : venueName,
    capacity,
    seatsLeft: Math.max(0, Math.min(left, capacity)),
    sample: false,
    family: "response",
  };
}

export type MapOptions = {
  /** BL course id → the website course that carries it (it keeps its own page and title) */
  linked: Map<string, { slug: string; title: string }>;
  /** website slugs already in use, which a generated course must not take */
  takenSlugs: Set<string>;
};

/** The whole list. Throws FeedError only when the response is not a course list at all. */
export function mapFeed(body: unknown, options: MapOptions): BlendedCourse[] {
  if (!body || typeof body !== "object" || !Array.isArray((body as { courses?: unknown }).courses)) {
    throw new FeedError("Not a course list");
  }

  const used = new Set(options.takenSlugs);
  const seen = new Set<string>();
  const out: BlendedCourse[] = [];

  for (const raw of (body as { courses: unknown[] }).courses) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Partial<FeedCourse>;
    const id = text(item.id, 100);
    const blSlug = text(item.slug, 200);
    const blTitle = text(item.title, 200);
    if (!id || !blSlug || !blTitle || seen.has(id)) continue;
    seen.add(id);

    const link = options.linked.get(id);
    let slug: string;
    if (link) {
      slug = link.slug;
    } else {
      const base = SLUG.test(blSlug) ? blSlug : `course-${id.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12)}`;
      const fallback = `blended-${id.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      slug = [base, `${base}-blended`, fallback].find((candidate) => !used.has(candidate)) ?? fallback;
      for (let n = 2; used.has(slug); n += 1) slug = `${fallback}-${n}`;
    }
    used.add(slug);

    const title = link?.title ?? blTitle;
    const description = paragraphs(item.description);
    const summary = text(item.summary, 400) ?? description[0]?.slice(0, 300) ?? blTitle;
    const certificate = item.certificate && typeof item.certificate === "object" ? text(item.certificate.name, 120) : null;
    const duration = text(item.length_label, 60);
    const delivery = item.delivery === "online" ? "Online" : "Blended";

    const course: Course = {
      slug,
      title,
      blurb: summary,
      delivery,
      category: "first-aid",
      status: "published",
      blendedCourseId: id,
      ...(duration ? { duration } : {}),
      ...(certificate ? { certificate } : {}),
      ...(imageUrl(item.image_url) ? { image: imageUrl(item.image_url) } : {}),
      ...(description.length ? { description } : {}),
      ...(validity(item.certificate?.valid_for_months) ? { validity: validity(item.certificate?.valid_for_months) } : {}),
    };

    const days = Array.isArray(item.practical_days) ? item.practical_days : [];
    const sessions = days
      .map((day) => mapDay(day, { slug, title, certificate: certificate ?? undefined, duration: duration ?? undefined }))
      .filter((session): session is BlendedSession => session !== null);

    out.push({ id, blSlug, linked: Boolean(link), slug, priceCents: parsePrice(item.price), course, sessions });
  }

  return out;
}
