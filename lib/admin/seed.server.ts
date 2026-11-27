import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { mergeContent, type SiteContent } from "@/lib/content";
import { defaultCoursePrices } from "@/lib/course-prices.server";
import { products } from "@/lib/shop";
import { defaultDeliveryRates } from "@/lib/shop-delivery";
import type { Docs } from "@/lib/admin/types";

/**
 * The one-time import.
 *
 * The first time the admin store is used it is filled from what the site runs
 * on today, so nothing is lost: the content file if one shipped (the old
 * dashboard's format; SITE_CONTENT_FILE overrides its path, which the
 * automated checks use), else the built-in copy and courses; the placeholder
 * classroom prices from lib/course-prices.server.ts (and any price the old
 * file held); every shop product at its current price; delivery at the
 * flagged zero. After that, the store is the source of truth.
 */

export const LEGACY_CONTENT_FILE =
  process.env.SITE_CONTENT_FILE ?? path.join(process.cwd(), "content", "site-content.json");

export const DEFAULT_VAT_NOTE = "All prices include VAT where it applies.";

async function legacyContent(): Promise<SiteContent> {
  try {
    return mergeContent(JSON.parse(await readFile(LEGACY_CONTENT_FILE, "utf8")));
  } catch {
    return mergeContent(null);
  }
}

export async function seedDocs(): Promise<Docs> {
  const legacy = await legacyContent();

  const coursePrices: Record<string, number | null> = {};
  for (const course of legacy.courses) {
    const price = course.price ?? defaultCoursePrices[course.slug];
    if (typeof price === "number" && price > 0) coursePrices[course.slug] = price;
  }

  return {
    copy: { hero: legacy.hero, facts: legacy.facts, process: legacy.process },
    // Prices move to their own document; the course copy no longer carries them.
    courses: legacy.courses.map(({ price: _price, ...course }) => {
      void _price;
      return course;
    }),
    dates: legacy.extraSessions,
    prices: {
      courses: coursePrices,
      shop: Object.fromEntries(products.map((product) => [product.slug, product.price])),
      delivery: defaultDeliveryRates,
      vatNote: DEFAULT_VAT_NOTE,
    },
  };
}
