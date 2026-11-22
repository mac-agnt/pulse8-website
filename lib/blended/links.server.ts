import "server-only";

/**
 * Pulse 8 Blended Learning's learner sign-in page (its `/login` route), from
 * BLENDED_LEARNING_URL alone: linking there needs no shared secret, so this
 * works even before the course feed is configured. Null while unset or unsafe.
 */
export function blendedSignInUrl(): string | null {
  const raw = process.env.BLENDED_LEARNING_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    return `${url.origin}/login`;
  } catch {
    return null;
  }
}
