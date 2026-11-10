import "server-only";

/**
 * Per-person course rates, in euro. SERVER ONLY.
 *
 * PLACEHOLDERS. Pulse 8 has not confirmed a price list; these are plausible
 * Irish market rates carried over from the first build. Public pages never
 * show them. The booking API reads them (or the dashboard's override, if one
 * was saved) to create a Stripe Checkout Session, and live payments stay off
 * until BOOKING_PAYMENTS_ENABLED is set, which should only happen once Pulse 8
 * has approved every rate here.
 *
 * Courses with no entry cannot be paid for online and fall back to enquiry.
 */
export const defaultCoursePrices: Record<string, number> = {
  "first-aid-response-phecc": 275,
  "first-aid-response-blended": 275,
  "first-aid-response-recertification": 195,
  "cardiac-first-response": 95,
  "basic-first-aid": 85,
  "paediatric-first-aid": 110,
  "school-first-aid-course": 95,
  "sports-first-aid": 110,
  "cpr-for-family-friends": 45,
  "emergency-first-aid-at-work-online": 45,
  "fire-marshal": 95,
  "fire-safety-awareness": 55,
  "manual-handling-training": 35,
  "patient-moving-handling-course": 185,
  "workplace-health-and-safety": 245,
  "vdu-training": 120,
  "safeguarding-children": 30,
  "equality-diversity-and-discrimination": 30,
  "level-1-food-safety-manufacturing": 30,
};
