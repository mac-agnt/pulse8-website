"use client";

import { useState, type FormEvent } from "react";
import { CircleNotch, Warning } from "@phosphor-icons/react";
import { SubmitButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Status = "idle" | "sending" | "sent" | "error";

export type CourseOption = { slug: string; title: string };

const SUCCESS = "Thanks. We\u2019ve received your enquiry and will get back to you.";
const FAILURE = "We couldn\u2019t send your enquiry. Please try again or email info@pulse8.ie.";

const field =
  "h-11 w-full rounded-[var(--radius-control)] border border-white/25 bg-white/10 px-3.5 text-[0.9375rem] text-on-navy placeholder:text-white/55 focus-visible:border-white/60";

const label = "mb-2 block text-[0.875rem] font-medium text-on-navy";

const optional = "font-normal text-on-navy-muted";

/** Same as the old site's quote form: is this for a group or one person. */
const BOOKING_TYPES = ["Group", "Individual"] as const;

/**
 * Posts to /api/enquiry, which emails info@pulse8.ie with Reply-To set to the
 * customer. Success is shown only once the server says the provider accepted
 * it; on failure everything typed stays in the form so it can be sent again.
 * The course list arrives as a prop from the server, so this client bundle
 * never carries catalogue data.
 *
 * The fields are the union of the two forms on the old site: the home page
 * "send a message" form and the contact page quote form, which also asked
 * whether it was a group or an individual, which course and which county.
 * A course page links here with ?course=<slug>, which arrives as
 * `defaultCourse` and preselects it.
 */
export function QuoteForm({
  courses,
  defaultCourse = "",
  idPrefix = "enquiry",
}: {
  courses: CourseOption[];
  defaultCourse?: string;
  /** keeps ids unique if two forms ever share a page */
  idPrefix?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [bookingType, setBookingType] = useState<(typeof BOOKING_TYPES)[number]>("Group");
  const knownCourse = courses.some((course) => course.slug === defaultCourse);
  const id = (name: string) => `${idPrefix}-${name}`;
  const bad = (name: string) => invalid.includes(name);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    if (!consent) {
      setStatus("error");
      setMessage("Tick the privacy policy box before sending.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const missing = ["name", "email", "phone", "county"].filter(
      (key) => !String(form.get(key) ?? "").trim(),
    );
    if (missing.length) {
      setInvalid(missing);
      setStatus("error");
      setMessage("Fill in the highlighted fields before sending.");
      return;
    }

    setStatus("sending");
    setMessage(null);
    setInvalid([]);

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          company: form.get("company"),
          bookingType,
          county: form.get("county"),
          course: form.get("course"),
          message: form.get("message"),
          website: form.get("website"),
          consent,
          source: `${window.location.pathname}${window.location.search}`,
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok: boolean; error?: string; fields?: string[] }
        | null;

      if (response.ok && result?.ok) {
        setStatus("sent");
        return;
      }

      setStatus("error");
      if (response.status === 400 && result?.fields?.length) {
        setInvalid(result.fields);
        setMessage(result.error ?? "Some details need another look.");
      } else if (response.status === 400 || response.status === 429) {
        setMessage(result?.error ?? FAILURE);
      } else {
        setMessage(FAILURE);
      }
    } catch {
      setStatus("error");
      setMessage(FAILURE);
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="rounded-[var(--radius-card)] border border-white/20 bg-white/5 p-8">
        <h3 className="text-xl font-semibold text-on-navy">Enquiry sent</h3>
        <p className="mt-3 max-w-[44ch] text-on-navy-muted">{SUCCESS}</p>
      </div>
    );
  }

  const fieldClass = (name: string) =>
    cn(field, bad(name) && "border-accent-strong ring-1 ring-accent-strong");

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      {/* Honeypot. Hidden from people and assistive tech; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id("website")}>Leave this empty</label>
        <input id={id("website")} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label className={label} htmlFor={id("name")}>
          Name
        </label>
        <input
          id={id("name")}
          name="name"
          required
          maxLength={120}
          autoComplete="name"
          aria-invalid={bad("name") || undefined}
          className={fieldClass("name")}
        />
      </div>

      <div>
        <label className={label} htmlFor={id("email")}>
          Email
        </label>
        <input
          id={id("email")}
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          aria-invalid={bad("email") || undefined}
          className={fieldClass("email")}
        />
      </div>

      <div>
        <label className={label} htmlFor={id("phone")}>
          Phone
        </label>
        <input
          id={id("phone")}
          name="phone"
          type="tel"
          required
          maxLength={40}
          autoComplete="tel"
          aria-invalid={bad("phone") || undefined}
          className={fieldClass("phone")}
        />
      </div>

      <div>
        <label className={label} htmlFor={id("company")}>
          Organisation <span className={optional}>(optional)</span>
        </label>
        <input
          id={id("company")}
          name="company"
          maxLength={160}
          autoComplete="organization"
          aria-invalid={bad("company") || undefined}
          className={fieldClass("company")}
        />
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
        <label className={label} htmlFor={id("county")}>
          County
        </label>
        <input
          id={id("county")}
          name="county"
          required
          maxLength={60}
          autoComplete="address-level1"
          aria-invalid={bad("county") || undefined}
          className={fieldClass("county")}
        />
      </div>

      <div className="sm:col-span-2">
        <label className={label} htmlFor={id("course")}>
          Course
        </label>
        {/* Dark colour scheme so the native option list matches the panel. */}
        <select
          id={id("course")}
          name="course"
          defaultValue={knownCourse ? defaultCourse : ""}
          aria-invalid={bad("course") || undefined}
          className={`${fieldClass("course")} appearance-auto [color-scheme:dark]`}
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
        <label className={label} htmlFor={id("message")}>
          Anything else <span className={optional}>(optional)</span>
        </label>
        <textarea
          id={id("message")}
          name="message"
          rows={4}
          maxLength={4000}
          placeholder="Group size, rough dates, special requirements"
          aria-invalid={bad("message") || undefined}
          className={`${fieldClass("message")} h-auto py-3`}
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
              if (status === "error" && event.target.checked && message?.startsWith("Tick")) {
                setStatus("idle");
                setMessage(null);
              }
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

        {/* Announced when it changes; stays put while the form is resent. */}
        <div role="alert" aria-live="assertive">
          {status === "error" && message ? (
            <p className="mt-3 flex items-start gap-2 text-[0.875rem] text-white">
              <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-accent-strong" />
              <span>{message}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="sm:col-span-2">
        <SubmitButton
          type="submit"
          size="lg"
          disabled={status === "sending"}
          aria-busy={status === "sending" || undefined}
        >
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
