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
 * Student sign-in. Not confirmed: www.p8courses.com is a "Join a course" page
 * (course ID entry, with a staff sign-in), and the cookie policy mentions a
 * separate Videotile e-learning portal. Set this once Pulse 8 names the one
 * learners should use; the header shows "Student login" only when it is set.
 */
function safeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export const studentLoginUrl: string | null = safeUrl(process.env.NEXT_PUBLIC_STUDENT_LOGIN_URL);

/** The learner "Join a course" page that the old nav item pointed at. */
export const joinCourseUrl = "https://www.p8courses.com/";
