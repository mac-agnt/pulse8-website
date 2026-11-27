import { NextResponse } from "next/server";
import {
  hashPassword,
  ipOf,
  limited,
  newUser,
  normaliseEmail,
  passwordProblem,
  recordAttempt,
  setupOpen,
  setupPasswordMatches,
  startSession,
  sameOrigin,
} from "@/lib/admin/auth.server";
import { adminStore } from "@/lib/admin/store.server";
import { singleLine } from "@/lib/validate.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether the first-owner form applies. */
export async function GET() {
  return NextResponse.json({ open: await setupOpen() });
}

/**
 * Creates the first owner. Needs ADMIN_PASSWORD, and only works while there is
 * no active owner; after that, owners add everyone else in the Staff panel.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Refused: not sent from this site." }, { status: 403 });
  const ipKey = `setup:ip:${ipOf(request)}`;
  if (await limited([{ key: ipKey, max: 5, minutes: 15 }])) {
    return NextResponse.json({ error: "Too many tries. Wait 15 minutes." }, { status: 429 });
  }
  if (!(await setupOpen())) {
    return NextResponse.json({ error: "The owner account already exists. Sign in instead." }, { status: 409 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!setupPasswordMatches(body?.setupPassword)) {
    await recordAttempt(ipKey);
    return NextResponse.json({ error: "That set-up password isn't right." }, { status: 401 });
  }
  const email = normaliseEmail(body?.email);
  const name = singleLine(body?.name, 80);
  if (!email || !name) return NextResponse.json({ error: "Enter your name and email." }, { status: 400 });
  const problem = passwordProblem(body?.password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const user = newUser({ email, name, role: "owner", passwordHash: await hashPassword(body?.password as string) });
  if (!(await adminStore().bootstrapOwner(user))) {
    return NextResponse.json({ error: "The owner account already exists. Sign in instead." }, { status: 409 });
  }
  const created = (await adminStore().userByEmail(email)) ?? user;
  const response = NextResponse.json({ ok: true });
  await startSession(response, created);
  await adminStore().audit({ id: created.id, name: created.name }, "staff.bootstrap", [
    `Created the first owner login (${created.name})`,
  ]);
  return response;
}
