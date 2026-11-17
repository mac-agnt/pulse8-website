import { NextResponse } from "next/server";
import { deliverBlendedEvent, dueBlendedEvents } from "@/lib/blended/notify.server";
import { getOrder, type BlendedEventKind } from "@/lib/booking/store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retries a booking's undelivered Blended Learning event now:
 * POST {} for whatever is due, or {"kind": "confirmed" | "refunded"}.
 * Behind the same basic auth as the dashboard (proxy.ts). The event id is
 * fixed per booking and kind, so BL never handles it twice.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { kind?: string };
  const asked =
    body.kind === "confirmed" || body.kind === "refunded" ? (body.kind as BlendedEventKind) : undefined;
  if (body.kind !== undefined && !asked) {
    return NextResponse.json({ error: "kind must be confirmed or refunded" }, { status: 400 });
  }

  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "No such booking" }, { status: 404 });
  if (!order.blended) return NextResponse.json({ error: "Not a Blended Learning booking" }, { status: 409 });

  const due = dueBlendedEvents(order);
  const kinds = asked ? due.filter((kind) => kind === asked) : due;
  if (!kinds.length) {
    const sent = asked && order.blended.deliveries[asked]?.status === "sent";
    return sent
      ? NextResponse.json({ ok: true, alreadySent: true })
      : NextResponse.json({ error: `Nothing is due for a ${order.status} booking` }, { status: 409 });
  }

  const results = [];
  for (const kind of kinds) results.push({ kind, ...(await deliverBlendedEvent(order, kind)) });
  const ok = results.every((result) => result.ok);
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 502 });
}
