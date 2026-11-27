import { NextResponse } from "next/server";
import { guard } from "@/lib/admin/auth.server";
import { adminStore } from "@/lib/admin/store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The latest 300 entries of who changed what. */
export async function GET(request: Request) {
  const { staff, response } = await guard(request);
  if (!staff) return response;
  return NextResponse.json(await adminStore().listAudit(300));
}
