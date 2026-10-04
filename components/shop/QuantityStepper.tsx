"use client";

import { useState } from "react";
import { Minus, Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

const MIN = 1;
const MAX = 99;

/**
 * Minus, number, plus. The number is a real input, so a quantity can be typed
 * as well as stepped. While someone is typing the field holds their draft;
 * anything that is not 1 to 99 settles back to the last good value on blur.
 */
export function QuantityStepper({
  value,
  onChange,
  name,
  size = "lg",
  className,
}: {
  value: number;
  onChange: (quantity: number) => void;
  /** product name, to tell several steppers apart for screen readers */
  name?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const of = name ? ` of ${name}` : "";

  const step =
    "grid h-full place-items-center text-ink-muted transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink-muted";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-stretch rounded-[var(--radius-control)] border border-border bg-surface",
        size === "lg" ? "h-13" : "h-10",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(MIN, value - 1))}
        disabled={value <= MIN}
        aria-label={`Decrease quantity${of}`}
        className={cn(step, size === "lg" ? "w-11" : "w-9")}
      >
        <Minus size={size === "lg" ? 16 : 14} weight="bold" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={`Quantity${of}`}
        value={draft ?? String(value)}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 2);
          setDraft(digits);
          const parsed = Number(digits);
          if (digits !== "" && parsed >= MIN) onChange(Math.min(MAX, parsed));
        }}
        onBlur={() => setDraft(null)}
        className={cn(
          "figure min-w-0 bg-transparent text-center font-medium text-ink",
          size === "lg" ? "w-10 text-base" : "w-8 text-[0.9375rem]",
        )}
      />

      <button
        type="button"
        onClick={() => onChange(Math.min(MAX, value + 1))}
        disabled={value >= MAX}
        aria-label={`Increase quantity${of}`}
        className={cn(step, size === "lg" ? "w-11" : "w-9")}
      >
        <Plus size={size === "lg" ? 16 : 14} weight="bold" />
      </button>
    </div>
  );
}
