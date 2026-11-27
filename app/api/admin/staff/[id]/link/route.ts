import { NextResponse } from "next/server";
import { actorOf, guard } from "@/lib/admin/auth.server";
import { sendSignInLink, signInLinkFor } from "@/lib/admin/link-mail.server";
import { adminStore } from "@/lib/admin/store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A sign-in link for someone, lasting 7 days. Owners only. Emailed to
 * them, or with `{ "copy": true }` returned to the owner to send themselves.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { staff, response } = await guard(request, "owner");
  if (!staff) return response;
  const { id } = await params;
  const user = await adminStore().userById(id);
  if (!user || !user.active) return NextResponse.json({ error: "No such active login." }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { copy?: unknown };
  if (body.copy === true) {
    const url = await signInLinkFor(user, request.headers.get("origin"));
    if (!url) return NextResponse.json({ error: "Sign-in links need SITE_URL set on the server." }, { status: 500 });
    await adminStore().audit(actorOf(staff.user), "staff.link", [`Made a sign-in link for ${user.name} to send them`]);
    return NextResponse.json({ ok: true, url });
  }
  const sent = await sendSignInLink(user, request.headers.get("origin"), { fromOwner: true });
  if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 502 });
  await adminStore().audit(actorOf(staff.user), "staff.link", [`Emailed a sign-in link to ${user.name}`]);
  return NextResponse.json({ ok: true });
}
