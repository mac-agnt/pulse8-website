/**
 * Public, client-safe site settings that are waiting on Pulse 8.
 *
 * Each one is read from a NEXT_PUBLIC_ variable, inlined at build time, so a
 * value can be supplied in Vercel without a code change. While a value is
 * unset the link it drives is simply not rendered.
 */

/**
 * WhatsApp business number, digits only with country code (e.g. 353871234567).
 * Not confirmed yet: the mobile in Tom's email signature is a candidate.
 */
const whatsappDigits = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

const WHATSAPP_PREFILL = "Hi Pulse 8, I'd like to ask about a training course.";

export const whatsappUrl: string | null =
  whatsappDigits.length >= 8
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(WHATSAPP_PREFILL)}`
    : null;

/**
 * Where learners sign in. There are three, so the header's "Student login"
 * is a small menu (components/sections/navMenus.ts):
 *   Blended learning  /student-login/blended, which redirects to
 *                     BLENDED_LEARNING_URL + /login
 *   Online courses    the Videotile portal's "Candidate Login" page, where
 *                     courses bought online are taken
 *   Classroom course  p8courses.com, which takes the course ID from the
 *                     joining email
 */
export const blendedLoginPath = "/student-login/blended";

export const onlineCoursesLoginUrl = "https://www.videotilehost.com/pulse8/index.php";

/** The learner "Join a course" page that the old nav item pointed at. */
export const joinCourseUrl = "https://www.p8courses.com/";
