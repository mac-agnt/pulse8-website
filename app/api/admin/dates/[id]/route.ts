import { NextResponse } from "next/server";
import { actorOf, guard } from "@/lib/admin/auth.server";
import { adminStore } from "@/lib/admin/store.server";
import { applyDateInput, describeChanges, describeDate } from "@/lib/admin/dates.server";
import { composeContent } from "@/lib/content.server";
import { listOrders } from "@/lib/booking/store.server";
import type { ExtraSession } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Edits a date, or closes / reopens it with { closed: true | false }. */
export async function PATCH(request: Request, { params }: Params) {
  const { staff, response } = await guard(request);
  if (!staff) return response;
  const { id } = await params;
  const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!input) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });

  const courses = composeContent(await adminStore().readDocs()).courses;
  let error = null as string | null;
  let saved = undefined as ExtraSession | undefined;
  await adminStore().updateDoc(
    "dates",
    (current) => {
      const existing = current.find((date) => date.id === id);
      if (!existing) {
        error = "That date no longer exists. Reload the page.";
        return { data: current, audit: [] };
      }
      const checked = applyDateInput(existing, input, courses);
      if (!checked.ok) {
        error = checked.error;
        return { data: current, audit: [] };
      }
      saved = checked.date;
      const label = describeDate(existing, courses);
      const audit: string[] = [];
      if (Boolean(existing.closed) !== Boolean(saved.closed)) {
        audit.push(`${saved.closed ? "Closed" : "Reopened"} date: ${label}`);
      }
      const changes = describeChanges(existing, saved);
      if (changes.length) audit.push(`Edited date: ${label} (${changes.join("; ")})`);
      return { data: current.map((date) => (date.id === id ? saved! : date)), audit };
    },
    { actor: actorOf(staff.user), action: "dates.edit" },
  );
  if (error) return NextResponse.json({ error }, { status: error.startsWith("That date") ? 404 : 400 });
  return NextResponse.json({ ok: true, date: saved });
}

/**
 * Removes a date entered by mistake. A date anyone has booked (or paid for,
 * even if refunded since) can't be deleted, only closed, so its bookings keep
 * pointing at something.
 */
export async function DELETE(request: Request, { params }: Params) {
  const { staff, response } = await guard(request);
  if (!staff) return response;
  const { id } = await params;
  const orders = (await listOrders()).filter(
    (order) => order.sessionId === id && !["expired", "failed"].includes(order.status),
  );
  if (orders.length) {
    return NextResponse.json(
      { error: "This date has bookings, so it can't be deleted. Close it instead: it comes off the website and the bookings stand." },
      { status: 409 },
    );
  }
  const courses = composeContent(await adminStore().readDocs()).courses;
  let found = false as boolean;
  await adminStore().updateDoc(
    "dates",
    (current) => {
      const existing = current.find((date) => date.id === id);
      if (!existing) return { data: current, audit: [] };
      found = true;
      return { data: current.filter((date) => date.id !== id), audit: [`Deleted date: ${describeDate(existing, courses)}`] };
    },
    { actor: actorOf(staff.user), action: "dates.delete" },
  );
  if (!found) return NextResponse.json({ error: "That date no longer exists." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
