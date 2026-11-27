import { NextResponse } from "next/server";
import { guard } from "@/lib/admin/auth.server";
import { sendShopEmail, shopEmailIsDue } from "@/lib/booking/shop-notify.server";
import { getShopOrder } from "@/lib/booking/shop-store.server";
import type { EmailKind } from "@/lib/booking/store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retries one shop order email: POST {"kind": "customer" | "staff"}. Same
 * provider idempotency key as the first attempt, so a message the provider
 * already accepted is not delivered twice.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { staff, response: refused } = await guard(request);
  if (!staff) return refused;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { kind?: string };
  const kind = body.kind === "customer" || body.kind === "staff" ? (body.kind as EmailKind) : null;
  if (!kind) return NextResponse.json({ error: "kind must be customer or staff" }, { status: 400 });

  const order = await getShopOrder(id);
  if (!order) return NextResponse.json({ error: "No such order" }, { status: 404 });
  if (!shopEmailIsDue(order, kind)) {
    return NextResponse.json({ error: `A ${kind} email is not due for a ${order.status} order` }, { status: 409 });
  }
  if (order.emails[kind].status === "sent") return NextResponse.json({ ok: true, alreadySent: true });

  const result = await sendShopEmail(order, kind);
  return NextResponse.json(result.ok ? { ok: true } : { ok: false, error: result.error }, {
    status: result.ok ? 200 : 502,
  });
}
