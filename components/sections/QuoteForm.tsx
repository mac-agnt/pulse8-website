"use client";

import { useState, type FormEvent } from "react";
import { CircleNotch, Warning } from "@phosphor-icons/react";
import { SubmitButton } from "@/components/ui/Button";

type Status = "idle" | "sending" | "sent" | "error";

const field =
  "h-11 w-full rounded-[var(--radius-control)] border border-white/25 bg-white/10 px-3.5 text-[0.9375rem] text-on-navy placeholder:text-white/55 focus-visible:border-white/60";

const label = "mb-2 block text-[0.875rem] font-medium text-on-navy";

/**
 * No backend on this build. The submit handler holds a sending state and then
 * reports success so the states are all visible; wire it to the Pulse 8 form
 * endpoint before launch.
 */
export function QuoteForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [consent, setConsent] = useState(false);

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
        <label className={label} htmlFor="company">
          Organisation
        </label>
        <input
          id="company"
          name="company"
          required
          autoComplete="organization"
          className={field}
        />
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

      <div className="sm:col-span-2">
        <label className={label} htmlFor="message">
          What do you need
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          placeholder="Course, group size and rough dates"
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
            <a href="https://pulse8.ie/policies/" className="text-on-navy underline underline-offset-4">
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
