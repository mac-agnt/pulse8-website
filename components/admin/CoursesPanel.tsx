"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { MagnifyingGlass, Plus, Trash, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { Course } from "@/lib/content";
import type { Delivery } from "@/lib/data";
import { Card, Field, Select, TextArea, TextInput, Toggle } from "@/components/admin/Field";

const DELIVERY: Delivery[] = ["Classroom", "Blended", "Online"];

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `course-${Date.now()}`
  );
}

/**
 * Course copy editor.
 *
 * List on the left, one course open on the right. Every field writes straight
 * into the draft, so the list reflects a rename as it is typed.
 */
export function CoursesPanel({
  courses,
  onChange,
}: {
  courses: Course[];
  onChange: (next: Course[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState(courses[0]?.slug ?? "");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(term) ||
        course.blurb.toLowerCase().includes(term) ||
        course.delivery.toLowerCase().includes(term),
    );
  }, [courses, query]);

  const active = courses.find((course) => course.slug === activeSlug) ?? courses[0];

  const patch = (values: Partial<Course>) => {
    if (!active) return;
    onChange(
      courses.map((course) =>
        course.slug === active.slug ? { ...course, ...values } : course,
      ),
    );
  };

  const addCourse = () => {
    const taken = new Set(courses.map((course) => course.slug));
    let slug = slugify("New course");
    for (let n = 2; taken.has(slug); n += 1) slug = `${slugify("New course")}-${n}`;

    const course: Course = {
      slug,
      title: "New course",
      blurb: "One or two lines on who the course is for and what it covers.",
      duration: "3 hours",
      price: 95,
      delivery: "Classroom",
      image: "/courses/basic-first-aid.webp",
    };
    onChange([...courses, course]);
    setActiveSlug(course.slug);
  };

  const removeCourse = (slug: string) => {
    const next = courses.filter((course) => course.slug !== slug);
    onChange(next);
    if (slug === activeSlug) setActiveSlug(next[0]?.slug ?? "");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <Card className="p-3 md:p-3">
        <div className="relative mb-2">
          <MagnifyingGlass
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter courses"
            className="w-full rounded-[var(--radius-control)] border border-border bg-bg py-2 pr-3 pl-9 text-[0.8125rem] text-ink transition-colors placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex max-h-[26rem] flex-col gap-0.5 overflow-y-auto lg:max-h-[34rem]">
          {filtered.map((course) => (
            <button
              key={course.slug}
              type="button"
              onClick={() => setActiveSlug(course.slug)}
              className={cn(
                "flex items-center gap-3 rounded-[8px] px-2.5 py-2 text-left transition-colors",
                course.slug === active?.slug
                  ? "bg-tint text-ink"
                  : "text-ink-muted hover:bg-tint/70 hover:text-ink",
              )}
            >
              <span className="relative size-9 shrink-0 overflow-hidden rounded-[6px]">
                <Image src={course.image} alt="" fill sizes="36px" className="object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.8125rem] font-medium">
                  {course.title}
                </span>
                <span className="figure block text-[0.6875rem] text-ink-faint">
                  {course.delivery} · €{course.price}
                </span>
              </span>
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="px-2.5 py-6 text-center text-[0.8125rem] text-ink-faint">
              Nothing matches {`"${query}"`}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={addCourse}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border py-2 text-[0.8125rem] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
        >
          <Plus size={14} weight="bold" />
          Add a course
        </button>
      </Card>

      {active ? (
        <div className="flex flex-col gap-5">
          <Card
            title={active.title}
            description={`Appears on the courses grid and at /book?course=${active.slug}`}
            action={
              <button
                type="button"
                onClick={() => removeCourse(active.slug)}
                className="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-2.5 py-1.5 text-[0.75rem] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
              >
                <Trash size={13} />
                Remove
              </button>
            }
          >
            <div className="flex flex-col gap-5">
              <Field label="Course title" htmlFor="course-title">
                <TextInput
                  id="course-title"
                  value={active.title}
                  onChange={(event) => patch({ title: event.target.value })}
                />
              </Field>

              <Field
                label="Description"
                hint="Two lines on the card. Say who it is for, not what the sector is called."
                htmlFor="course-blurb"
              >
                <TextArea
                  id="course-blurb"
                  value={active.blurb}
                  onChange={(event) => patch({ blurb: event.target.value })}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Duration" hint="Free text, e.g. 18 hours or 150 minutes">
                  <TextInput
                    value={active.duration}
                    onChange={(event) => patch({ duration: event.target.value })}
                  />
                </Field>
                <Field label="Price per person" hint="Euro, whole numbers">
                  <TextInput
                    type="number"
                    min={0}
                    value={active.price}
                    onChange={(event) => patch({ price: Number(event.target.value) || 0 })}
                  />
                </Field>
                <Field label="Delivery">
                  <Select
                    value={active.delivery}
                    onChange={(event) =>
                      patch({ delivery: event.target.value as Delivery })
                    }
                  >
                    {DELIVERY.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Maximum participants" hint="Leave empty for online courses">
                  <TextInput
                    type="number"
                    min={1}
                    value={active.maxParticipants ?? ""}
                    onChange={(event) =>
                      patch({
                        maxParticipants: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      })
                    }
                  />
                </Field>
                <Field label="Certificate" hint="PHECC, CPD, or a Pulse 8 certificate">
                  <TextInput
                    value={active.certificate ?? ""}
                    onChange={(event) =>
                      patch({ certificate: event.target.value || undefined })
                    }
                  />
                </Field>
                <Field label="Image path" hint="A file already in /public">
                  <TextInput
                    value={active.image}
                    onChange={(event) => patch({ image: event.target.value })}
                  />
                </Field>
              </div>

              <div className="flex flex-col gap-4 border-t border-border pt-5">
                <Toggle
                  checked={Boolean(active.headline)}
                  onChange={(next) => patch({ headline: next || undefined })}
                  label="Feature this course"
                />
                <Toggle
                  checked={Boolean(active.unverifiedDuration)}
                  onChange={(next) => patch({ unverifiedDuration: next || undefined })}
                  label="Flag the duration as unconfirmed"
                />
                {active.unverifiedDuration ? (
                  <p className="flex items-start gap-2 rounded-[var(--radius-control)] bg-accent-soft px-3 py-2.5 text-[0.8125rem] text-accent-strong">
                    <Warning size={16} className="mt-0.5 shrink-0" />
                    The duration on this course still needs confirming before it goes out.
                  </p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card title="Card preview" description="How it reads on the courses grid">
            <div className="max-w-sm overflow-hidden rounded-[var(--radius-card)] bg-navy-deep">
              <div className="relative h-40">
                <Image
                  src={active.image}
                  alt=""
                  fill
                  sizes="384px"
                  className="object-cover"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy-deep to-transparent"
                />
              </div>
              <div className="px-5 pb-5">
                <h3 className="text-lg leading-snug font-semibold text-on-navy">
                  {active.title}
                </h3>
                <p className="mt-2.5 border-b border-white/10 pb-4 text-[0.9375rem] leading-relaxed text-on-navy-muted">
                  {active.blurb}
                </p>
                <p className="figure mt-4 text-[0.8125rem] text-white/55">
                  {active.duration} · {active.delivery} · €{active.price}
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <p className="py-10 text-center text-[0.9375rem] text-ink-muted">
            No courses yet. Add one to get started.
          </p>
        </Card>
      )}
    </div>
  );
}
