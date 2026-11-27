import { NextResponse } from "next/server";
import { actorOf, guard } from "@/lib/admin/auth.server";
import { sendSignInLink } from "@/lib/admin/link-mail.server";
import { adminStore } from "@/lib/admin/store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Emails someone a one-time sign-in link, e.g. when they've forgotten their password. Owners only. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { staff, response } = await guard(request, "owner");
  if (!staff) return response;
  const { id } = await params;
  const user = await adminStore().userById(id);
  if (!user || !user.active) return NextResponse.json({ error: "No such active login." }, { status: 404 });
  const sent = await sendSignInLink(user, request.headers.get("origin"));
  if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 502 });
  await adminStore().audit(actorOf(staff.user), "staff.link", [`Emailed a sign-in link to ${user.name}`]);
  return NextResponse.json({ ok: true });
}
