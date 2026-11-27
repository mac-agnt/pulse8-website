import { NextResponse } from "next/server";
import { actorOf, guard, hashPassword, passwordProblem } from "@/lib/admin/auth.server";
import { adminStore } from "@/lib/admin/store.server";
import { summarise, type StaffUser } from "@/lib/admin/types";
import { singleLine } from "@/lib/validate.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Changes someone's name, role, access or password: PATCH { name?, role?,
 * active?, password? }. Owners only. The last active owner can't be demoted
 * or switched off, so the admin can never be left without one. Switching
 * someone off, or resetting their password, signs them out everywhere.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { staff, response } = await guard(request, "owner");
  if (!staff) return response;
  const { id } = await params;
  const store = adminStore();
  const user = await store.userById(id);
  if (!user) return NextResponse.json({ error: "No such login." }, { status: 404 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

  const next: StaffUser = { ...user };
  const log: string[] = [];
  if (body.name !== undefined) {
    const name = singleLine(body.name, 80);
    if (!name) return NextResponse.json({ error: "Enter a name." }, { status: 400 });
    if (name !== user.name) log.push(`Renamed login ${user.name} → ${name}`);
    next.name = name;
  }
  if (body.role === "owner" || body.role === "staff") {
    if (body.role !== user.role) log.push(`${next.name}: role ${user.role} → ${body.role}`);
    next.role = body.role;
  }
  if (typeof body.active === "boolean") {
    if (body.active !== user.active) log.push(`${body.active ? "Turned on" : "Turned off"} login: ${next.name}`);
    next.active = body.active;
  }
  let resetPassword = false;
  if (typeof body.password === "string" && body.password !== "") {
    const problem = passwordProblem(body.password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    next.passwordHash = await hashPassword(body.password);
    resetPassword = true;
    log.push(`Set a new password for ${next.name}`);
  }

  const losesOwner = user.role === "owner" && user.active && (next.role !== "owner" || !next.active);
  if (losesOwner && (await store.countActiveOwners()) <= 1) {
    return NextResponse.json(
      { error: "This is the only owner. Make someone else an owner first." },
      { status: 409 },
    );
  }

  await store.putUser(next);
  if (!next.active || resetPassword) {
    await store.deleteUserSessions(user.id, user.id === staff.user.id ? staff.tokenHash : undefined);
  }
  if (log.length) await store.audit(actorOf(staff.user), "staff.edit", log);
  return NextResponse.json({ ok: true, user: summarise(next) });
}
