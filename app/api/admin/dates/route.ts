import { NextResponse } from "next/server";
import { actorOf, guard } from "@/lib/admin/auth.server";
import { adminStore } from "@/lib/admin/store.server";
import { applyDateInput, datableCourses, describeDate, newDateId } from "@/lib/admin/dates.server";
import { composeContent } from "@/lib/content.server";
import { seatsTakenBySession } from "@/lib/booking/store.server";
import type { ExtraSession } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Classroom dates with how many places are booked or being paid for, and the courses a date can be for. */
export async function GET(request: Request) {
  const { staff, response } = await guard(request);
  if (!staff) return response;
  const docs = await adminStore().readDocs();
  const content = composeContent(docs);
  const taken = await seatsTakenBySession().catch(() => new Map<string, number>());
  return NextResponse.json({
    dates: docs.dates.data.map((date) => ({ ...date, booked: taken.get(date.id) ?? 0 })),
    courses: datableCourses(content.courses).map((course) => ({
      slug: course.slug,
      title: course.title,
      duration: course.duration ?? null,
      price: course.price ?? null,
      maxParticipants: course.maxParticipants ?? null,
      draft: course.status === "draft",
    })),
  });
}

/** Adds a date. It is on /book straight away. */
export async function POST(request: Request) {
  const { staff, response } = await guard(request);
  if (!staff) return response;
  const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!input) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });

  const docs = await adminStore().readDocs();
  const courses = composeContent(docs).courses;
  const base: ExtraSession = { id: "", courseSlug: "", date: "", start: "09:30", days: 1, seatsLeft: 10, online: false };
  const checked = applyDateInput(base, { courseSlug: undefined, date: undefined, ...input }, courses);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  const date = { ...checked.date, id: newDateId(checked.date.date) };
  delete date.closed;

  await adminStore().updateDoc(
    "dates",
    (current) => ({
      data: [...current, date],
      audit: [`Added date: ${describeDate(date, courses)}, ${date.seatsLeft} places`],
    }),
    { actor: actorOf(staff.user), action: "dates.add" },
  );
  return NextResponse.json({ ok: true, date: { ...date, booked: 0 } });
}
