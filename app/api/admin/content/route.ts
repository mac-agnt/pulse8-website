import { NextResponse } from "next/server";
import { actorOf, guard } from "@/lib/admin/auth.server";
import { adminStore } from "@/lib/admin/store.server";
import { composeContent } from "@/lib/content.server";
import { mergeContent, type Course } from "@/lib/content";
import { VersionConflict, type CopyDoc } from "@/lib/admin/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Site copy and course descriptions, with the versions a save must name. */
export async function GET(request: Request) {
  const { staff, response } = await guard(request);
  if (!staff) return response;
  const docs = await adminStore().readDocs();
  return NextResponse.json({
    content: composeContent(docs),
    versions: { copy: docs.copy.version, courses: docs.courses.version },
  });
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function copyChanges(before: CopyDoc, after: CopyDoc): string[] {
  const parts = [
    !same(before.hero, after.hero) && "hero",
    !same(before.facts, after.facts) && "numbers",
    !same(before.process, after.process) && "booking steps",
  ].filter(Boolean);
  return parts.length ? [`Edited site copy: ${parts.join(", ")}`] : [];
}

function courseChanges(before: Course[], after: Course[]): string[] {
  const old = new Map(before.map((course) => [course.slug, course]));
  const now = new Map(after.map((course) => [course.slug, course]));
  const lines: string[] = [];
  for (const course of after) {
    const prior = old.get(course.slug);
    if (!prior) lines.push(`Added course: ${course.title}`);
    else if (!same(prior, course)) {
      const fields = Object.keys({ ...prior, ...course }).filter(
        (key) => !same(prior[key as keyof Course], course[key as keyof Course]),
      );
      lines.push(`Edited course: ${course.title} (${fields.join(", ")})`);
    }
  }
  for (const course of before) if (!now.has(course.slug)) lines.push(`Removed course: ${course.title}`);
  return lines;
}

/**
 * Saves site copy and course descriptions: PUT { content, versions }. A save
 * naming an old version is refused (409) rather than overwriting someone
 * else's edit. Prices are not saved here: they have their own panel.
 */
export async function PUT(request: Request) {
  const { staff, response } = await guard(request);
  if (!staff) return response;
  const body = (await request.json().catch(() => null)) as {
    content?: unknown;
    versions?: { copy?: unknown; courses?: unknown };
  } | null;
  if (!body?.content || typeof body.content !== "object") {
    return NextResponse.json({ error: "The content sent was not valid." }, { status: 400 });
  }
  const merged = mergeContent(body.content);
  const copy: CopyDoc = { hero: merged.hero, facts: merged.facts, process: merged.process };
  const courses = merged.courses.map(({ price: _price, ...course }) => {
    void _price;
    return course as Course;
  });
  const slugs = new Set<string>();
  for (const course of courses) {
    if (typeof course.slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(course.slug) || slugs.has(course.slug)) {
      return NextResponse.json({ error: "Each course needs its own web address (lower case letters, numbers and dashes)." }, { status: 400 });
    }
    slugs.add(course.slug);
    if (typeof course.title !== "string" || !course.title.trim()) {
      return NextResponse.json({ error: "Every course needs a title." }, { status: 400 });
    }
  }

  const actor = actorOf(staff.user);
  const version = (value: unknown) => (typeof value === "number" ? value : undefined);
  try {
    await adminStore().updateDoc("copy", (current) => ({ data: copy, audit: copyChanges(current, copy) }), {
      actor,
      action: "content.copy",
      expectedVersion: version(body.versions?.copy),
    });
    await adminStore().updateDoc("courses", (current) => ({ data: courses, audit: courseChanges(current, courses) }), {
      actor,
      action: "content.courses",
      expectedVersion: version(body.versions?.courses),
    });
  } catch (error) {
    if (error instanceof VersionConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
  const docs = await adminStore().readDocs();
  return NextResponse.json({
    content: composeContent(docs),
    versions: { copy: docs.copy.version, courses: docs.courses.version },
  });
}
