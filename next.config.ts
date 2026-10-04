import type { NextConfig } from "next";

/**
 * Every public URL on the old WordPress site, pointed at its new home, so
 * bookmarks, printed links and search rankings survive the move. Product pages
 * (/product/<slug>), /shop, /cart and /about kept their paths and need nothing.
 *
 * Listed out rather than imported: the config loader does not resolve the
 * app's path aliases, and these lists only change when a URL does.
 */
const COURSE_SLUGS = [
  "first-aid-response-phecc",
  "first-aid-response-recertification",
  "cardiac-first-response",
  "basic-first-aid",
  "paediatric-first-aid",
  "school-first-aid-course",
  "sports-first-aid",
  "cpr-for-family-friends",
  "emergency-first-aid-at-work-online",
  "fire-marshal",
  "fire-safety-awareness",
  "manual-handling-training",
  "patient-moving-handling-course",
  "workplace-health-and-safety",
  "vdu-training",
  "safeguarding-children",
  "equality-diversity-and-discrimination",
  "level-1-food-safety-manufacturing",
];

const SHOP_CATEGORIES = [
  "defibrillators",
  "pads",
  "batteries",
  "defibrillator-cabinets",
  "aed-bags-signs",
  "first-aid-supplies",
  "wearables",
  "workplace",
  "schools",
  "montessori-childcare",
  "books",
];

/** Old upload filename to the copy now served from /public/documents. */
const POLICY_PDFS: Record<string, string> = {
  "P1.-Teaching-Learning-Policy-Aug-25.pdf": "p1-teaching-and-learning.pdf",
  "P02.-Diversity-Equality-Inclusion-Policy-Aug-25.pdf": "p02-diversity-equality-inclusion.pdf",
  "P03.-Anti-Bullying-Harassment-Policy-Aug-25.pdf": "p03-anti-bullying-harassment.pdf",
  "P05.-Complaints-Policy-Aug-25.pdf": "p05-complaints.pdf",
  "P07.-Access-Transfer-Progression-Policy-Aug-25.pdf": "p07-access-transfer-progression.pdf",
  "P09.-Health-Safety-Welfare-Policy-Aug-25.pdf": "p09-health-safety-welfare.pdf",
  "P11.-Data-Protection-Policy-Aug-25.pdf": "p11-data-protection.pdf",
  "P17.-Student-Support-Policy-Aug-25.pdf": "p17-student-support.pdf",
  "P18.-Assessment-Policy-Aug-25.pdf": "p18-assessment.pdf",
  "P19.-Quality-Policy-Aug-25.pdf": "p19-quality.pdf",
  "SD41.-Code-of-Conduct-Aug-25.pdf": "sd41-code-of-conduct.pdf",
  "SD42.-Student-Charter-Aug-25.pdf": "sd42-student-charter.pdf",
};

const nextConfig: NextConfig = {
  async redirects() {
    const moved = (source: string, destination: string) => ({
      source,
      destination,
      permanent: true,
    });

    return [
      moved("/contact-us", "/contact"),
      moved("/faqs", "/#faq"),
      moved("/faq-items/:path*", "/#faq"),
      moved("/all-courses", "/courses"),
      moved("/category/courses", "/courses"),
      moved("/e-learning-courses", "/courses#online"),
      moved("/category/e-learning-courses", "/courses#online"),
      moved("/cancellation-policy", "/policies/cancellation"),
      moved("/privacy-policy", "/policies/privacy"),
      moved("/cookie-policy-eu", "/policies/cookies"),
      moved("/checkout", "/cart"),
      moved("/my-account", "/shop"),
      ...COURSE_SLUGS.map((slug) => moved(`/${slug}`, `/courses/${slug}`)),
      ...SHOP_CATEGORIES.flatMap((slug) => [
        moved(`/${slug}`, `/shop/${slug}`),
        moved(`/product-category/${slug}`, `/shop/${slug}`),
      ]),
      ...Object.entries(POLICY_PDFS).map(([from, to]) =>
        moved(`/wp-content/uploads/2026/01/${from}`, `/documents/${to}`),
      ),
    ];
  },
};

export default nextConfig;
