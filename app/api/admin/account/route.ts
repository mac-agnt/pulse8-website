import { NextResponse } from "next/server";
import { guard, hashPassword, passwordProblem, verifyPassword } from "@/lib/admin/auth.server";
import { adminStore } from "@/lib/admin/store.server";
import { summarise } from "@/lib/admin/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { staff, response } = await guard(request);
  if (!staff) return response;
  return NextResponse.json(summarise(staff.user));
}

/**
 * Sets or changes your own password. Someone who only ever used email links
 * has none and can set one without the current password; changing an existing
 * one needs it. Every other browser signed in as you is signed out.
 */
export async function POST(request: Request) {
  const { staff, response } = await guard(request);
  if (!staff) return response;
  const body = (await request.json().catch(() => null)) as { current?: unknown; password?: unknown } | null;
  const { user } = staff;
  if (user.passwordHash && !(await verifyPassword(String(body?.current ?? ""), user.passwordHash))) {
    return NextResponse.json({ error: "Your current password isn't right." }, { status: 400 });
  }
  const problem = passwordProblem(body?.password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  await adminStore().putUser({ ...user, passwordHash: await hashPassword(body?.password as string) });
  await adminStore().deleteUserSessions(user.id, staff.tokenHash);
  await adminStore().audit({ id: user.id, name: user.name }, "account.password", [
    user.passwordHash ? "Changed their password" : "Set a password",
  ]);
  return NextResponse.json({ ok: true });
}
