"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { CheckCircle, Info, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/** Buttons, badges and notices for the dashboard, in the site's tokens. */

const VARIANTS = {
  primary: "bg-accent text-on-accent hover:bg-accent-strong disabled:bg-tint disabled:text-ink-faint",
  secondary:
    "border border-border bg-surface text-ink hover:border-ink-faint disabled:text-ink-faint disabled:hover:border-border",
  ghost: "text-ink-muted hover:bg-tint hover:text-ink disabled:text-ink-faint",
  danger: "border border-border bg-surface text-accent-strong hover:border-accent hover:bg-accent-soft disabled:text-ink-faint",
} as const;

export function AdminButton({
  variant = "secondary",
  size = "md",
  className,
  icon,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: "sm" | "md";
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed",
        size === "sm" ? "px-2.5 py-1.5 text-[0.75rem]" : "px-3.5 py-2 text-[0.8125rem]",
        VARIANTS[variant],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "muted"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        tone === "good" && "bg-[oklch(94%_0.05_155)] text-[oklch(38%_0.09_155)]",
        tone === "warn" && "bg-accent-soft text-accent-strong",
        tone === "neutral" && "bg-tint text-ink",
        tone === "muted" && "bg-tint text-ink-faint",
      )}
    >
      {children}
    </span>
  );
}

export function Notice({ tone = "info", children, className }: { tone?: "info" | "error" | "success"; children: ReactNode; className?: string }) {
  const Icon = tone === "error" ? Warning : tone === "success" ? CheckCircle : Info;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-[var(--radius-control)] px-3 py-2.5 text-[0.8125rem] leading-relaxed",
        tone === "error" && "bg-accent-soft text-accent-strong",
        tone === "success" && "bg-[oklch(95%_0.04_155)] text-[oklch(35%_0.09_155)]",
        tone === "info" && "bg-tint text-ink-muted",
        className,
      )}
    >
      <Icon size={16} weight="fill" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** A euro input: "€" in front, numbers only, blank allowed. */
export function EuroInput({
  value,
  onChange,
  placeholder = "Enquire",
  label,
  changed,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  changed?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex w-full items-center", className)}>
      <span className="pointer-events-none absolute left-3 text-[0.9375rem] text-ink-faint">€</span>
      <input
        aria-label={label}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
        className={cn(
          "figure w-full rounded-[var(--radius-control)] border bg-surface py-2 pr-3 pl-7 text-right text-[0.9375rem] text-ink transition-colors placeholder:text-ink-faint hover:border-ink-faint/60 focus:border-accent focus:outline-none",
          changed ? "border-accent bg-accent-soft/40" : "border-border",
        )}
      />
    </span>
  );
}
