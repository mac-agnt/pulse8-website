import type { MetadataRoute } from "next";

/** Crawl everything public; keep the dashboard, the API and the basket out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/cart"] },
    sitemap: "https://pulse8.ie/sitemap.xml",
  };
}
