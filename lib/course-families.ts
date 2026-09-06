import { courses } from "@/lib/data";

/**
 * Colour coding for the schedule.
 *
 * Eighteen courses cannot each have a hue: any two can land in the same day
 * cell, so every pair has to be separable, and no eighteen-colour set survives
 * that. These four do, on the categorical slots blue / orange / aqua / violet —
 * worst all-pairs separation is CVD deltaE 9.2 and normal-vision 16.3, clear of
 * the 8 and 15 floors. Grouping into families is also more use to a buyer than
 * eighteen arbitrary colours would be.
 *
 * Colour is never the only cue: every chip carries the course name, and the
 * legend above the grid names each family.
 */
export type FamilyKey = "response" | "young" | "fire" | "workplace";

export type Family = {
  key: FamilyKey;
  label: string;
  /** CSS custom property holding the hue */
  token: string;
};

export const families: Family[] = [
  { key: "response", label: "First aid and resuscitation", token: "--cal-response" },
  { key: "young", label: "Children, schools and sport", token: "--cal-young" },
  { key: "fire", label: "Fire safety", token: "--cal-fire" },
  { key: "workplace", label: "Handling and compliance", token: "--cal-workplace" },
];

const BY_SLUG: Record<string, FamilyKey> = {
  "first-aid-response-phecc": "response",
  "first-aid-response-recertification": "response",
  "cardiac-first-response": "response",
  "basic-first-aid": "response",
  "cpr-for-family-friends": "response",
  "emergency-first-aid-at-work-online": "response",

  "paediatric-first-aid": "young",
  "school-first-aid-course": "young",
  "sports-first-aid": "young",
  "safeguarding-children": "young",

  "fire-marshal": "fire",
  "fire-safety-awareness": "fire",

  "manual-handling-training": "workplace",
  "patient-moving-handling-course": "workplace",
  "workplace-health-and-safety": "workplace",
  "vdu-training": "workplace",
  "equality-diversity-and-discrimination": "workplace",
  "level-1-food-safety-manufacturing": "workplace",
};

/** Anything unmapped falls to the workplace slot rather than inventing a hue. */
export function familyFor(slug: string): Family {
  const key = BY_SLUG[slug] ?? "workplace";
  return families.find((family) => family.key === key) ?? families[3];
}

export function colourFor(slug: string): string {
  return `var(${familyFor(slug).token})`;
}

/** Every course is mapped. Guards against a course being added and missed. */
export const unmappedCourses = courses
  .map((course) => course.slug)
  .filter((slug) => !(slug in BY_SLUG));
