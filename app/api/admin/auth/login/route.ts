import { NextResponse } from "next/server";
import {
  checkPassword,
  clearAttempts,
  ipOf,
  limited,
  normaliseEmail,
  recordAttempt,
  startSession,
  sameOrigin,
} from "@/lib/admin/auth.server";
import { adminStore } from "@/lib/admin/store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Email and password sign-in. 5 wrong tries per email, or 30 per address, in 15 minutes. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Refused: not sent from this site." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = normaliseEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password || password.length > 200) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const emailKey = `login:email:${email}`;
  const ipKey = `login:ip:${ipOf(request)}`;
  if (await limited([{ key: emailKey, max: 5, minutes: 15 }, { key: ipKey, max: 30, minutes: 15 }])) {
    return NextResponse.json(
      { error: "Too many tries. Wait 15 minutes, or use “Email me a sign-in link”." },
      { status: 429 },
    );
  }

  const user = await checkPassword(email, password);
  if (!user) {
    await recordAttempt(emailKey, ipKey);
    return NextResponse.json({ error: "That email and password don't match." }, { status: 401 });
  }

  await clearAttempts(emailKey);
  const response = NextResponse.json({ ok: true });
  await startSession(response, user);
  await adminStore().audit({ id: user.id, name: user.name }, "auth.login", ["Signed in with a password"]);
  return response;
}
