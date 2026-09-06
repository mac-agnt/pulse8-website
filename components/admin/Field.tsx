"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Form primitives for the dashboard.
 *
 * Label above the control, helper below it, one radius, one focus ring. They
 * use the site tokens rather than a second palette, so the CMS looks like the
 * site it edits.
 */

const controlBase =
  "w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2.5 text-[0.9375rem] text-ink transition-colors placeholder:text-ink-faint hover:border-ink-faint/60 focus:border-accent focus:outline-none";

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-[0.8125rem] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[0.75rem] text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlBase, className)} />;
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={cn(controlBase, "min-h-24 resize-y leading-relaxed", className)} />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(controlBase, "appearance-none pr-8", className)}>
      {children}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left"
    >
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-accent" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow-sm transition-transform duration-200",
            checked && "translate-x-4",
          )}
        />
      </span>
      <span className="text-[0.9375rem] text-ink">{label}</span>
    </button>
  );
}

/** A titled block of fields. The dashboard is built entirely out of these. */
export function Card({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-surface p-5 md:p-6",
        className,
      )}
    >
      {title ? (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-ink">{title}</h2>
            {description ? (
              <p className="mt-1 text-[0.8125rem] text-ink-muted">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
