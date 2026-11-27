import { NextResponse } from "next/server";
import { actorOf, guard, hashPassword, newUser, normaliseEmail, passwordProblem } from "@/lib/admin/auth.server";
import { sendSignInLink } from "@/lib/admin/link-mail.server";
import { adminStore } from "@/lib/admin/store.server";
import { summarise } from "@/lib/admin/types";
import { singleLine } from "@/lib/validate.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everyone with a login. Owners only. */
export async function GET(request: Request) {
  const { staff, response } = await guard(request, "owner");
  if (!staff) return response;
  return NextResponse.json((await adminStore().listUsers()).map(summarise));
}

/**
 * Adds a login: POST { name, email, role, password?, sendLink? }. With a
 * password, tell the person it yourself; with sendLink, they get an email with
 * a sign-in link and can set their own password once in.
 */
export async function POST(request: Request) {
  const { staff, response } = await guard(request, "owner");
  if (!staff) return response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = singleLine(body?.name, 80);
  const email = normaliseEmail(body?.email);
  const role = body?.role === "owner" ? "owner" : "staff";
  if (!name || !email) return NextResponse.json({ error: "Enter their name and email." }, { status: 400 });
  const password = typeof body?.password === "string" && body.password !== "" ? body.password : null;
  if (password) {
    const problem = passwordProblem(password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }
  if (!password && body?.sendLink !== true) {
    return NextResponse.json({ error: "Give them a starting password, or tick “Email them a sign-in link”." }, { status: 400 });
  }

  const user = newUser({ email, name, role, passwordHash: password ? await hashPassword(password) : null });
  if (!(await adminStore().putUser(user))) {
    return NextResponse.json({ error: "Someone already has a login with that email." }, { status: 409 });
  }
  await adminStore().audit(actorOf(staff.user), "staff.add", [`Added ${role} login: ${name}`]);

  let linkSent: boolean | undefined;
  if (body?.sendLink === true) {
    const sent = await sendSignInLink(user, request.headers.get("origin"), { welcome: true });
    linkSent = sent.ok;
    if (!sent.ok) console.error("[admin-staff] welcome link not sent:", sent.error);
  }
  return NextResponse.json({ ok: true, user: summarise(user), linkSent });
}
