import "server-only";
import { unstable_cache } from "next/cache";
import { mapFeed, type BlendedCourse } from "@/lib/blended/map";
import { FEED_PATH, FEED_PAYLOAD, signedHeaders } from "@/lib/blended/signing";
import type { Course } from "@/lib/data";

/**
 * Pulse 8 Blended Learning (BL) course list: the source of truth for blended
 * courses, their practical days, places and price.
 *
 * Read with a signed GET, so the response carries prices (an unsigned read of
 * the same URL never does). Cached under the tag `blended-courses` for an
 * hour; BL's `course.changed` message (app/api/integrations/blended-learning)
 * drops the cache at once. Checkout reads it fresh.
 *
 * When BL is unconfigured, slow or down, every function here reports
 * "unavailable" and the site simply shows no blended dates. Nothing throws.
 */

export const BLENDED_CACHE_TAG = "blended-courses";

const PAGE_TIMEOUT_MS = 4_000;
const FRESH_TIMEOUT_MS = 8_000;
/** After a failed read, pages stop asking for this long (per instance), so a BL outage costs one wait, not one per page. */
const BACKOFF_MS = 60_000;

export type BlendedConfig = { baseUrl: string; secret: string };

/** BLENDED_LEARNING_URL (https, or http for a localhost test) and BLENDED_LEARNING_SECRET, or null. */
export function blendedConfig(): BlendedConfig | null {
  const raw = process.env.BLENDED_LEARNING_URL?.trim();
  const secret = process.env.BLENDED_LEARNING_SECRET ?? "";
  if (!raw || secret.length < 16) return null;
  try {
    const url = new URL(raw);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    return { baseUrl: url.origin, secret };
  } catch {
    return null;
  }
}

/**
 * Website courses that are BL courses too, keyed by BL course id: any course
 * whose saved content carries `blendedCourseId`, plus
 * BLENDED_LEARNING_COURSE_LINKS ("<website slug>=<BL course id>", comma
 * separated), which is how first-aid-response-blended is linked without a code
 * change once its BL course exists.
 */
export function courseLinks(courses: Course[]): Map<string, { slug: string; title: string }> {
  const bySlug = new Map(courses.map((course) => [course.slug, course]));
  const links = new Map<string, { slug: string; title: string }>();
  for (const pair of (process.env.BLENDED_LEARNING_COURSE_LINKS ?? "").split(",")) {
    const [slug, id] = pair.split("=").map((value) => value?.trim());
    const course = slug ? bySlug.get(slug) : undefined;
    if (course && id) links.set(id, { slug: course.slug, title: course.title });
  }
  for (const course of courses) {
    if (course.blendedCourseId) links.set(course.blendedCourseId, { slug: course.slug, title: course.title });
  }
  return links;
}

async function fetchList(config: BlendedConfig, timeoutMs: number): Promise<unknown> {
  const response = await fetch(`${config.baseUrl}${FEED_PATH}`, {
    headers: { accept: "application/json", ...signedHeaders(config.secret, FEED_PAYLOAD) },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`course list answered ${response.status}`);
  return response.json();
}

const cachedList = unstable_cache(
  async (baseUrl: string) => {
    const config = blendedConfig();
    if (!config || config.baseUrl !== baseUrl) throw new Error("not configured");
    return fetchList(config, PAGE_TIMEOUT_MS);
  },
  ["blended-learning-course-list", "v2"],
  { tags: [BLENDED_CACHE_TAG], revalidate: 3600 },
);

let downUntil = 0;

export type Catalogue = { ok: true; courses: BlendedCourse[] } | { ok: false };

/**
 * BL's courses mapped onto this site. `websiteCourses` are the published
 * website courses: they decide which BL courses are linked and which slugs a
 * generated course may not take. `fresh` skips every cache (checkout).
 */
export async function blendedCatalogue(
  websiteCourses: Course[],
  { fresh = false }: { fresh?: boolean } = {},
): Promise<Catalogue> {
  const config = blendedConfig();
  if (!config) return { ok: false };
  if (!fresh && Date.now() < downUntil) return { ok: false };

  try {
    const body = fresh ? await fetchList(config, FRESH_TIMEOUT_MS) : await cachedList(config.baseUrl);
    const courses = mapFeed(body, {
      linked: courseLinks(websiteCourses),
      takenSlugs: new Set(websiteCourses.map((course) => course.slug)),
    });
    return { ok: true, courses };
  } catch (error) {
    if (!fresh) downUntil = Date.now() + BACKOFF_MS;
    // The URL and the reason only: never the secret or the response body.
    console.error("[blended-learning] course list unavailable:", (error as Error).message);
    return { ok: false };
  }
}
