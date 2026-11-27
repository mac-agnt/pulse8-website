import { NextResponse } from "next/server";
import { ipOf, limited, recordAttempt, redeemLoginToken, startSession, sameOrigin } from "@/lib/admin/auth.server";
import { adminStore } from "@/lib/admin/store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Spends a sign-in link's token and signs the browser in. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Refused: not sent from this site." }, { status: 403 });
  const ipKey = `verify:ip:${ipOf(request)}`;
  if (await limited([{ key: ipKey, max: 20, minutes: 15 }])) {
    return NextResponse.json({ error: "Too many tries. Wait 15 minutes." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const user = await redeemLoginToken(body?.token);
  if (!user) {
    await recordAttempt(ipKey);
    return NextResponse.json(
      { error: "This link has expired or was already used. Ask for a new one." },
      { status: 400 },
    );
  }
  const response = NextResponse.json({ ok: true });
  await startSession(response, user);
  await adminStore().audit({ id: user.id, name: user.name }, "auth.login", ["Signed in with an email link"]);
  return response;
}
