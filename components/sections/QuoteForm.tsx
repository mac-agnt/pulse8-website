"use client";

import { useState, type FormEvent } from "react";
import { CircleNotch, Warning } from "@phosphor-icons/react";
import { SubmitButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { courses } from "@/lib/data";

type Status = "idle" | "sending" | "sent" | "error";

const field =
  "h-11 w-full rounded-[var(--radius-control)] border border-white/25 bg-white/10 px-3.5 text-[0.9375rem] text-on-navy placeholder:text-white/55 focus-visible:border-white/60";

const label = "mb-2 block text-[0.875rem] font-medium text-on-navy";

const optional = "font-normal text-on-navy-muted";

/** Same as the old site's quote form: is this for a group or one person. */
const BOOKING_TYPES = ["Group", "Individual"] as const;

/**
 * No backend on this build. The submit handler holds a sending state and then
 * reports success so the states are all visible; wire it to the Pulse 8 form
 * endpoint before launch.
 *
 * The fields are the union of the two forms on the old site: the home page
 * "send a message" form and the contact page quote form, which also asked
 * whether it was a group or an individual, which course and which county.
 * A course page links here with ?course=<slug>, which arrives as
 * `defaultCourse` and preselects it.
 */
export function QuoteForm({ defaultCourse = "" }: { defaultCourse?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [consent, setConsent] = useState(false);
  const [bookingType, setBookingType] = useState<(typeof BOOKING_TYPES)[number]>("Group");
  const knownCourse = courses.some((course) => course.slug === defaultCourse);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!consent) {
      setStatus("error");
      return;
    }

    setStatus("sending");
    await new Promise((resolve) => setTimeout(resolve, 700));
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="rounded-[var(--radius-card)] border border-white/20 bg-white/5 p-8">
        <h3 className="text-xl font-semibold text-on-navy">Request received</h3>
        <p className="mt-3 max-w-[44ch] text-on-navy-muted">
          Someone will come back to you within one working day with dates and what the room
          needs to have in it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      <div>
        <label className={label} htmlFor="name">
          Name
        </label>
        <input id="name" name="name" required autoComplete="name" className={field} />
      </div>

      <div>
        <label className={label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={field}
        />
      </div>

      <div>
        <label className={label} htmlFor="phone">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          className={field}
        />
      </div>

      <div>
        <label className={label} htmlFor="company">
          Organisation <span className={optional}>(optional)</span>
        </label>
        <input id="company" name="company" autoComplete="organization" className={field} />
      </div>

      <fieldset>
        <legend className={label}>Group or individual</legend>
        <div className="grid h-11 grid-cols-2 gap-1 rounded-[var(--radius-control)] border border-white/25 bg-white/10 p-1">
          {BOOKING_TYPES.map((type) => (
            <label
              key={type}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-[7px] text-[0.875rem] font-medium transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                bookingType === type
                  ? "bg-white text-navy-deep"
                  : "text-on-navy-muted hover:text-on-navy",
              )}
            >
              <input
                type="radio"
                name="bookingType"
                value={type}
                checked={bookingType === type}
                onChange={() => setBookingType(type)}
                className="sr-only"
              />
              {type}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className={label} htmlFor="county">
          County
        </label>
        <input
          id="county"
          name="county"
          required
          autoComplete="address-level1"
          className={field}
        />
      </div>

      <div className="sm:col-span-2">
        <label className={label} htmlFor="course">
          Course
        </label>
        {/* Dark colour scheme so the native option list matches the panel. */}
        <select
          id="course"
          name="course"
          defaultValue={knownCourse ? defaultCourse : ""}
          className={`${field} appearance-auto [color-scheme:dark]`}
        >
          <option value="">Not sure yet</option>
          {courses.map((course) => (
            <option key={course.slug} value={course.slug}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className={label} htmlFor="message">
          Anything else <span className={optional}>(optional)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Group size, rough dates, special requirements"
          className={`${field} h-auto py-3`}
        />
      </div>

      <div className="sm:col-span-2">
        <label className="flex items-start gap-3 text-[0.875rem] text-on-navy-muted">
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
              if (status === "error") setStatus("idle");
            }}
            className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
          />
          <span>
            I agree to the{" "}
            <a href="/policies/privacy" className="text-on-navy underline underline-offset-4">
              privacy policy
            </a>
            .
          </span>
        </label>

        {status === "error" ? (
          <p className="mt-3 inline-flex items-center gap-2 text-[0.875rem] text-white">
            <Warning size={16} weight="fill" className="text-accent-strong" />
            Tick the privacy policy box before sending.
          </p>
        ) : null}
      </div>

      <div className="sm:col-span-2">
        <SubmitButton type="submit" size="lg" disabled={status === "sending"}>
          {status === "sending" ? (
            <>
              <CircleNotch size={17} weight="bold" className="animate-spin" />
              Sending
            </>
          ) : (
            "Send enquiry"
          )}
        </SubmitButton>
      </div>
    </form>
  );
}
