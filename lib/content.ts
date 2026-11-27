import { courses as defaultCourses, facts as defaultFacts, type Course, type Fact } from "@/lib/data";

/**
 * Editable site content.
 *
 * Everything the admin dashboard at /admin can change. Defaults come straight
 * from lib/data.ts, so the site renders identically until someone saves an
 * edit. Saved content lives in content/site-content.json and is merged over
 * these defaults on the server.
 */

export type HeroCopy = {
  eyebrow: string;
  headline: string;
  subline: string;
  primaryCta: string;
  secondaryCta: string;
};

export type ProcessCopy = {
  heading: string;
  steps: Array<{ title: string; body: string }>;
};

/** A date added by hand in the dashboard, on top of the generated schedule. */
export type ExtraSession = {
  id: string;
  courseSlug: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM, 24 hour */
  start: string;
  /** HH:MM; worked out from the course's duration when not set */
  end?: string;
  days: number;
  /** places released for online booking (bookings are counted against these) */
  seatsLeft: number;
  online: boolean;
  /** where it runs; Pulse 8's training centre when not set */
  venue?: string;
  /**
   * Euro per person for this date only, in place of the course price. SERVER
   * AND ADMIN ONLY, like Course.price: never part of a public session.
   */
  priceOverride?: number | null;
  /** closed: off the public calendar and no longer bookable; existing bookings stand */
  closed?: boolean;
  /** staff only, never shown publicly */
  note?: string;
};

export type SiteContent = {
  hero: HeroCopy;
  facts: Fact[];
  process: ProcessCopy;
  courses: Course[];
  extraSessions: ExtraSession[];
  /** ISO timestamp of the last save, or null when nothing has been saved yet */
  updatedAt: string | null;
};

export const defaultContent: SiteContent = {
  hero: {
    // No longer shown: PHECC prescribes the text beside its mark, so the hero
    // uses PhecMark (lib/brand.ts). Kept so older saved content still loads.
    eyebrow: "PHECC Recognised Institution",
    // Words in *asterisks* get the gradient.
    headline: "First aid and safety training across Ireland",
    subline:
      "Pulse 8 delivers first aid, fire safety and manual handling training nationwide, with blended, in-person and online options.",
    primaryCta: "Book a course",
    secondaryCta: "Browse courses",
  },
  facts: defaultFacts,
  process: {
    heading: "From booking to certificate",
    steps: [
      {
        title: "Pick a date, or bring us in",
        body: "Book a place on a scheduled date, or tell us your numbers and we run it at your place.",
      },
      {
        title: "Practise it hands on",
        body: "Manikins, AED trainers and practical scenarios, led by someone who has handled the real thing.",
      },
      {
        title: "Leave certified",
        body: "A PHECC, CPD or Pulse 8 certificate when you pass. Most stay valid for two years.",
      },
    ],
  },
  courses: defaultCourses,
  extraSessions: [],
  updatedAt: null,
};

/**
 * Saved content can be partial or stale, so every branch falls back to the
 * default rather than trusting the file. Courses are matched on slug: an entry
 * the file does not know about keeps its default.
 */
export function mergeContent(saved: unknown): SiteContent {
  if (!saved || typeof saved !== "object") return defaultContent;
  const input = saved as Partial<SiteContent>;

  const courses = Array.isArray(input.courses) && input.courses.length
    ? input.courses
    : defaultContent.courses;

  return {
    hero: { ...defaultContent.hero, ...(input.hero ?? {}) },
    facts:
      Array.isArray(input.facts) && input.facts.length ? input.facts : defaultContent.facts,
    process: {
      heading: input.process?.heading ?? defaultContent.process.heading,
      steps:
        Array.isArray(input.process?.steps) && input.process.steps.length
          ? input.process.steps
          : defaultContent.process.steps,
    },
    courses,
    extraSessions: Array.isArray(input.extraSessions) ? input.extraSessions : [],
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : null,
  };
}

export type { Course, Fact };
