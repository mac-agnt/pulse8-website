import { NextResponse } from "next/server";
import { clearSessionCookie, currentStaff, sameOrigin } from "@/lib/admin/auth.server";
import { adminStore } from "@/lib/admin/store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Refused: not sent from this site." }, { status: 403 });
  const staff = await currentStaff().catch(() => null);
  if (staff) await adminStore().deleteSession(staff.tokenHash);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
