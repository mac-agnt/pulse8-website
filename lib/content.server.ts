import "server-only";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { defaultContent, mergeContent, type SiteContent } from "@/lib/content";
import { defaultCoursePrices } from "@/lib/course-prices.server";
import { blendedCatalogue } from "@/lib/blended/feed.server";
import { isPublished, toPublicCourse, type PublicCourse } from "@/lib/data";

/**
 * Content storage.
 *
 * A JSON file on disk, not a database: the dashboard is a single-editor tool
 * and the site is small enough that a file is the honest shape for it. Works
 * under `next dev` and on any node host with a writable filesystem. On a
 * read-only filesystem (Vercel and other serverless hosts) the write throws
 * and the API reports that saving is unavailable; the site itself keeps
 * rendering from whatever file shipped with the build, or the defaults.
 */

// SITE_CONTENT_FILE lets a test run use its own content without touching the repo copy.
const FILE = process.env.SITE_CONTENT_FILE ?? path.join(process.cwd(), "content", "site-content.json");

/**
 * Everything, rates included. For the dashboard and the booking API only:
 * public pages use `readPublicContent`.
 */
export async function readContent(): Promise<SiteContent> {
  let content: SiteContent;
  try {
    const raw = await readFile(FILE, "utf8");
    content = mergeContent(JSON.parse(raw));
  } catch {
    // No file yet, or unparseable. The defaults are the source of truth.
    content = defaultContent;
  }

  // A rate saved in the dashboard wins; otherwise the server-side default.
  return {
    ...content,
    courses: content.courses.map((course) => {
      const price = course.price ?? defaultCoursePrices[course.slug];
      return price === undefined ? course : { ...course, price };
    }),
  };
}

export type PublicContent = Omit<SiteContent, "courses"> & {
  /** published courses only, with no rates */
  courses: PublicCourse[];
};

/**
 * What public pages may render: published courses, and no prices anywhere.
 *
 * Pulse 8 Blended Learning's courses are part of the catalogue: a website
 * course linked to one carries its `blendedCourseId`, and a BL course with no
 * website counterpart gets a generated entry. If BL is unreachable those
 * simply drop out. The dashboard reads `readContent`, so nothing from BL is
 * ever saved into the content file.
 */
export async function readPublicContent(): Promise<PublicContent> {
  const content = await readContent();
  const published = content.courses.filter(isPublished);
  const catalogue = await blendedCatalogue(published);
  const linkedIds = new Map(
    catalogue.ok
      ? catalogue.courses.filter((item) => item.linked).map((item) => [item.slug, item.id] as const)
      : [],
  );
  const generated = catalogue.ok ? catalogue.courses.filter((item) => !item.linked).map((item) => item.course) : [];
  const courses = [
    ...published.map((course) =>
      linkedIds.has(course.slug) ? { ...course, blendedCourseId: linkedIds.get(course.slug) } : course,
    ),
    ...generated,
  ].map(toPublicCourse);
  return {
    ...content,
    courses,
    // The course count is derived from the catalogue, never typed in.
    facts: content.facts.map((fact) =>
      fact.label === "Courses" ? { ...fact, value: String(courses.length) } : fact,
    ),
  };
}

export async function writeContent(input: unknown): Promise<SiteContent> {
  const next = { ...mergeContent(input), updatedAt: new Date().toISOString() };
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}
