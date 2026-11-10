import "server-only";

/**
 * Input checks for anything a form sends. Every value is trimmed and length
 * capped; single-line values may not carry control characters, which is what
 * stops a CR/LF smuggling extra headers into an email.
 */

// C0 controls and DEL. Line breaks are only allowed in free-text fields.
const CONTROL = /[\u0000-\u001f\u007f]/;
const CONTROL_EXCEPT_NEWLINES = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function singleLine(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > max || CONTROL.test(trimmed)) return null;
  return trimmed;
}

export function multiLine(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\r\n?/g, "\n").trim();
  if (trimmed.length > max || CONTROL_EXCEPT_NEWLINES.test(trimmed)) return null;
  return trimmed;
}

/**
 * One mailbox, nothing else: no display name, no list, no comments, no
 * whitespace. Deliberately stricter than RFC 5322.
 */
const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function emailAddress(value: unknown): string | null {
  const email = singleLine(value, 254);
  if (!email || !EMAIL.test(email)) return null;
  const [local] = email.split("@");
  if (local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return null;
  }
  return email;
}

export function phoneNumber(value: unknown): string | null {
  const phone = singleLine(value, 40);
  if (!phone || !/^\+?[0-9 ()-]{6,}$/.test(phone)) return null;
  return phone;
}

/** A same-site path, for recording which page a form was sent from. */
export function sourcePath(value: unknown): string {
  const path = singleLine(value, 200);
  return path && /^\/[A-Za-z0-9\-._~/?=&%#]*$/.test(path) ? path : "unknown";
}

/**
 * Best-effort, per-instance rate limit. On a serverless host each instance
 * keeps its own window, so this blunts bursts rather than enforcing a hard
 * global cap; put a shared limiter (or the host's firewall) in front for that.
 */
const windows = new Map<string, number[]>();

export function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (windows.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    windows.set(key, recent);
    return true;
  }
  recent.push(now);
  windows.set(key, recent);
  if (windows.size > 5000) {
    for (const [entry, times] of windows) {
      if (times.every((time) => now - time >= windowMs)) windows.delete(entry);
    }
  }
  return false;
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}
