import { NextResponse } from "next/server";
import { emailIsDue, sendBookingEmail } from "@/lib/booking/notify.server";
import { getOrder, type EmailKind } from "@/lib/booking/store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retries one booking email: POST {"kind": "customer" | "staff"}.
 * Uses the same provider idempotency key as the first attempt, so a message
 * the provider already accepted is not delivered twice.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { kind?: string };
  const kind = body.kind === "customer" || body.kind === "staff" ? (body.kind as EmailKind) : null;
  if (!kind) return NextResponse.json({ error: "kind must be customer or staff" }, { status: 400 });

  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "No such booking" }, { status: 404 });
  if (!emailIsDue(order, kind)) {
    return NextResponse.json({ error: `A ${kind} email is not due for a ${order.status} booking` }, { status: 409 });
  }
  if (order.emails[kind].status === "sent") return NextResponse.json({ ok: true, alreadySent: true });

  const result = await sendBookingEmail(order, kind);
  return NextResponse.json(result.ok ? { ok: true } : { ok: false, error: result.error }, {
    status: result.ok ? 200 : 502,
  });
}
