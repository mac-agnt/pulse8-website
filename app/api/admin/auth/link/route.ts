import { NextResponse } from "next/server";
import { ipOf, limited, normaliseEmail, recordAttempt, sameOrigin } from "@/lib/admin/auth.server";
import { sendSignInLink } from "@/lib/admin/link-mail.server";
import { adminStore } from "@/lib/admin/store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Emails a sign-in link. The answer is the same whether or not the email has a
 * login, so the form can't be used to find out who works at Pulse 8.
 * 3 links per email, or 10 per address, in 15 minutes.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Refused: not sent from this site." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = normaliseEmail(body?.email);
  if (!email) return NextResponse.json({ error: "Enter your email address." }, { status: 400 });

  const emailKey = `link:email:${email}`;
  const ipKey = `link:ip:${ipOf(request)}`;
  if (await limited([{ key: emailKey, max: 3, minutes: 15 }, { key: ipKey, max: 10, minutes: 15 }])) {
    return NextResponse.json({ error: "Too many links asked for. Wait 15 minutes and try again." }, { status: 429 });
  }
  await recordAttempt(emailKey, ipKey);

  const user = await adminStore().userByEmail(email);
  if (user?.active) {
    const sent = await sendSignInLink(user, request.headers.get("origin"));
    if (!sent.ok) console.error("[admin-auth] sign-in link not sent:", sent.error);
  }
  return NextResponse.json({ ok: true });
}
