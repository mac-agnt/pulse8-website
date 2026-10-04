import type { MetadataRoute } from "next";
import { courses } from "@/lib/data";
import { categories, products } from "@/lib/shop";
import { policyPages } from "@/lib/policies";

const BASE = "https://pulse8.ie";

/**
 * Every public page. The old WordPress site published a sitemap, so the new
 * one replaces it at the same address. The admin, basket and API are left out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/courses", "/book", "/shop", "/about", "/contact", "/policies"];

  return [
    ...pages.map((path) => ({ url: `${BASE}${path}` })),
    ...courses.map((course) => ({ url: `${BASE}/courses/${course.slug}` })),
    ...categories.map((category) => ({ url: `${BASE}/shop/${category.slug}` })),
    ...products.map((product) => ({ url: `${BASE}/product/${product.slug}` })),
    ...policyPages.map((page) => ({ url: `${BASE}/policies/${page.slug}` })),
  ];
}
