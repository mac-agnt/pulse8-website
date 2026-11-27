import "server-only";
import { defaultCoursePrices } from "@/lib/course-prices.server";
import { blendedCatalogue } from "@/lib/blended/feed.server";
import { isPublished, toPublicCourse, type PublicCourse } from "@/lib/data";
import type { SiteContent } from "@/lib/content";
import { adminStore } from "@/lib/admin/store.server";
import { seedDocs } from "@/lib/admin/seed.server";
import type { PricesDoc, StoredDocs } from "@/lib/admin/types";
import { defaultShopPriceList, type ShopPriceList } from "@/lib/shop-pricing";

/**
 * Content storage.
 *
 * Everything staff edit in /admin lives in the admin store
 * (lib/admin/store.server.ts): Postgres schema `website` in production, a
 * JSON file in development. It is kept as a few documents (copy, courses,
 * dates, prices) and put back together here into the one SiteContent shape
 * the site has always rendered from.
 */

/** A course's price: the Prices panel's figure (null there means Enquire), else the old placeholder. */
function coursePrice(prices: PricesDoc, slug: string): number | undefined {
  if (Object.hasOwn(prices.courses, slug)) {
    const value = prices.courses[slug];
    return typeof value === "number" && value > 0 ? value : undefined;
  }
  return defaultCoursePrices[slug];
}

export function composeContent(docs: StoredDocs): SiteContent {
  const prices = docs.prices.data;
  const updated = Object.values(docs)
    .map((doc) => doc.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  return {
    ...docs.copy.data,
    courses: docs.courses.data.map((course) => {
      const { price: _ignored, ...rest } = course;
      void _ignored;
      const price = coursePrice(prices, course.slug);
      return price === undefined ? rest : { ...rest, price };
    }),
    extraSessions: docs.dates.data,
    updatedAt: updated.at(-1) ?? null,
  };
}

/**
 * Everything, rates included. For the dashboard and the booking API only:
 * public pages use `readPublicContent`.
 */
export async function readContent(): Promise<SiteContent> {
  return composeContent(await adminStore().readDocs());
}

/**
 * For public pages: the stored content, or, if the store can't be read right
 * now, the built-in copy and courses with no dates, so a database hiccup never
 * takes the site down. Booking and checkout use `readContent` and fail closed.
 */
export async function readContentForDisplay(): Promise<SiteContent> {
  try {
    return await readContent();
  } catch (error) {
    console.error("[content] store unavailable, showing built-in content:", (error as Error).message);
    const seed = await seedDocs();
    const blank = { version: 0, updatedAt: null, updatedBy: null };
    return composeContent({
      copy: { data: seed.copy, ...blank },
      courses: { data: seed.courses, ...blank },
      dates: { data: [], ...blank },
      prices: { data: seed.prices, ...blank },
    });
  }
}

/** Shop prices and delivery as staff set them; the lib/shop prices if the store can't be read. */
export async function readShopPriceList(): Promise<ShopPriceList & { vatNote: string }> {
  try {
    const { prices } = await adminStore().readDocs();
    return { products: prices.data.shop, delivery: prices.data.delivery, vatNote: prices.data.vatNote };
  } catch (error) {
    console.error("[content] shop prices unavailable, using built-in prices:", (error as Error).message);
    return { ...defaultShopPriceList, vatNote: "" };
  }
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
  const content = await readContentForDisplay();
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
