"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretDown, SignIn } from "@phosphor-icons/react";
import { studentLoginItems } from "@/components/sections/navMenus";
import { cn } from "@/lib/cn";

/**
 * "Student login" in the header bar (lg and up; the mobile sheet lists the
 * same links). One button opens a small panel drawn like the nav's dropdown
 * panel: the same card, icon tiles, label and description.
 *
 * It opens on click, tap or keyboard (no hover, so it never covers the nav by
 * accident). Opening from the keyboard moves focus to the first link; Escape
 * closes and puts focus back on the button; clicking or tabbing away closes
 * it. Icon only between 1024 and 1279px, where the bar has no room for words.
 */
export function StudentLoginMenu({ onGlass }: { onGlass: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function toggle(fromKeyboard: boolean) {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (fromKeyboard) {
      // After the panel is no longer inert.
      requestAnimationFrame(() => panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus());
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative hidden lg:block"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Student login"
        title="Student login"
        onClick={(event) => toggle(event.detail === 0)}
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center gap-1.5 rounded-full border text-[0.9375rem] font-medium whitespace-nowrap transition-colors duration-200 xl:size-auto xl:rounded-none xl:border-0",
          onGlass ? "border-white/25 text-white/85 hover:text-white" : "border-border text-ink-muted hover:text-ink",
        )}
      >
        <SignIn size={16} weight="bold" />
        <span className="hidden xl:inline">Student login</span>
        <CaretDown
          size={13}
          weight="bold"
          className={cn("hidden transition-transform duration-300 xl:inline", open && "rotate-180")}
        />
      </button>

      {/* pt-3 is a gap, kept inside the panel so a click on it stays "inside". */}
      <div
        ref={panelRef}
        id={panelId}
        inert={!open}
        aria-hidden={!open}
        className={cn(
          "absolute top-full right-0 z-50 pt-3 transition-opacity duration-150",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[0_20px_50px_-12px_rgb(15_23_42/0.18)]">
          <h3 className="mb-4 text-[0.75rem] font-medium tracking-[0.08em] text-ink-faint uppercase">
            Student login
          </h3>
          <ul className="space-y-4">
            {studentLoginItems.map((entry) => {
              const Icon = entry.icon;
              return (
                <li key={entry.label}>
                  <a
                    href={entry.href}
                    onClick={() => setOpen(false)}
                    {...(entry.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group/item flex items-start gap-3"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] border border-border text-ink transition-colors duration-300 group-hover/item:border-accent group-hover/item:bg-accent group-hover/item:text-on-accent">
                      <Icon size={18} weight="bold" />
                    </span>
                    <span className="w-max leading-5">
                      <span className="block text-[0.875rem] font-medium text-ink">{entry.label}</span>
                      <span className="block text-[0.75rem] text-ink-faint transition-colors duration-300 group-hover/item:text-ink-muted">
                        {entry.description}
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
