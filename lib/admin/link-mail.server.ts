import "server-only";
import { escapeHtml, sendMail } from "@/lib/mail/send.server";
import { returnOrigin } from "@/lib/booking/config.server";
import { LINK_MINUTES, issueLoginToken } from "@/lib/admin/auth.server";
import type { StaffUser } from "@/lib/admin/types";

/**
 * Emails a one-time sign-in link. The link opens a page with a button, and
 * only pressing it spends the token: mail scanners that open links on their
 * own can't use it up. The origin comes from SITE_URL (and its allowlist),
 * never from the request's Host header.
 */
export async function sendSignInLink(
  user: StaffUser,
  requestOrigin: string | null,
  { welcome = false }: { welcome?: boolean } = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const origin = returnOrigin(requestOrigin);
  if (!origin) return { ok: false, error: "Sign-in links need SITE_URL set on the server." };
  const token = await issueLoginToken(user);
  const url = `${origin}/admin/login/link#${token}`;
  const intro = welcome
    ? `Hi ${user.name}, you now have a login for the Pulse 8 website admin, where you can set prices, add course dates and more.`
    : `Hi ${user.name}, here is your link to sign in to the Pulse 8 website admin.`;
  const sent = await sendMail({
    to: [user.email],
    subject: welcome ? "Your Pulse 8 website admin login" : "Sign in to the Pulse 8 website admin",
    text: `${intro}\n\nSign in: ${url}\n\nThe link works once, for ${LINK_MINUTES} minutes. Once you're in, you can set a password under "Your account". If you didn't expect this email, ignore it.\n\nPulse 8 Training`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5"><p>${escapeHtml(intro)}</p><p><a href="${escapeHtml(url)}" style="display:inline-block;background:#c8202f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Sign in</a></p><p>The link works once, for ${LINK_MINUTES} minutes. Once you're in, you can set a password under "Your account". If you didn't expect this email, ignore it.</p><p>Pulse 8 Training</p></div>`,
  });
  return sent.ok ? { ok: true } : { ok: false, error: "The email could not be sent." };
}
