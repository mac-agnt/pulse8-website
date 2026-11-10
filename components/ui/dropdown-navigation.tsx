"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CaretDown, Storefront } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import type { NavItem } from "@/components/sections/navMenus";

type Size = { w: number; h: number };

/**
 * Header navigation with mega dropdowns.
 *
 * There is exactly one dropdown panel, and it never unmounts while you move
 * between menus. Every menu's content is rendered inside it at once (stacked,
 * only the active one visible), so moving from Courses to Shop is just the
 * panel sliding sideways and resizing to the new content with a cross-fade.
 * Nothing mounts, measures or animates layout on the way, which is what made
 * the earlier version stutter.
 *
 * Each menu has two independent controls: the label is a plain link to the
 * section, and the caret beside it is a button that opens the menu (by click,
 * tap or keyboard). Hover also opens it with a pointer. Opening from the
 * keyboard moves focus to the first link in the panel; Escape closes and
 * returns focus to the caret that opened it. Leaving the whole nav area closes
 * it after a short grace period, so crossing the gap between a label and the
 * panel does not flicker it shut. `onGlass` swaps the labels to white for the
 * transparent bar over the hero. Items with `variant: "outlined"` (Shop) draw
 * as a secondary action.
 */
export function DropdownNavigation({
  items,
  onGlass = false,
}: {
  items: NavItem[];
  onGlass?: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [sizes, setSizes] = useState<Record<string, Size>>({});
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [bounds, setBounds] = useState<{ left: number; viewport: number } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Measure each menu once, off to the side, so the panel can size to it.
  useEffect(() => {
    const measure = () => {
      const nextSizes: Record<string, Size> = {};
      const nextOffsets: Record<string, number> = {};
      for (const item of items) {
        const content = contentRefs.current[item.label];
        const li = itemRefs.current[item.label];
        if (content) nextSizes[item.label] = { w: content.offsetWidth, h: content.offsetHeight };
        if (li) nextOffsets[item.label] = li.offsetLeft;
      }
      setSizes(nextSizes);
      setOffsets(nextOffsets);
      const rect = listRef.current?.getBoundingClientRect();
      setBounds(rect ? { left: rect.left, viewport: document.documentElement.clientWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [items]);

  function show(label: string | null) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const hasMenu = label ? items.some((i) => i.label === label && i.subMenus) : false;
    if (hasMenu && label) {
      // The bar narrows once the page scrolls, so measure where it is now.
      const rect = listRef.current?.getBoundingClientRect();
      if (rect) setBounds({ left: rect.left, viewport: document.documentElement.clientWidth });
      setActive(label);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  function toggleFromButton(label: string, fromKeyboard: boolean) {
    if (open && active === label) {
      setOpen(false);
      return;
    }
    show(label);
    if (fromKeyboard) {
      // After the panel is no longer inert.
      requestAnimationFrame(() => {
        contentRefs.current[label]?.querySelector<HTMLAnchorElement>("a")?.focus();
      });
    }
  }

  function closeAndReturnFocus() {
    if (!open) return;
    setOpen(false);
    if (active) triggerRefs.current[active]?.focus();
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const size = active ? sizes[active] : undefined;
  // Line the panel up under its label, but keep all of it on screen (Shop is
  // the last item, and the Courses panel is wider than the nav itself).
  const offset = active ? (offsets[active] ?? 0) : 0;
  const GUTTER = 16;
  const x =
    size && bounds
      ? Math.max(
          GUTTER - bounds.left,
          Math.min(offset, bounds.viewport - GUTTER - bounds.left - (size.w + 40)),
        )
      : offset;
  const menus = items.filter((item) => item.subMenus);

  return (
    <div
      className="relative"
      onMouseLeave={scheduleClose}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") closeAndReturnFocus();
      }}
    >
      <ul ref={listRef} className="relative flex items-center">
        {items.map((item) => {
          const isOpen = open && active === item.label;
          const outlined = item.variant === "outlined";
          const panelId = `nav-panel-${item.id}`;
          return (
            <li
              key={item.label}
              ref={(node) => {
                itemRefs.current[item.label] = node;
              }}
              onPointerEnter={(event) => {
                // Hover is for mice and pens; a tap goes through the controls.
                if (event.pointerType === "touch") return;
                setHovered(item.id);
                show(item.label);
              }}
              onPointerLeave={() => setHovered(null)}
              className={cn(
                "relative flex items-center rounded-full",
                outlined &&
                  (onGlass
                    ? "ml-2 border border-white/35"
                    : "ml-2 border border-border transition-colors duration-200 hover:border-ink-faint"),
              )}
            >
              <Link
                href={item.href}
                onFocus={() => {
                  if (open && active !== item.label) setOpen(false);
                }}
                className={cn(
                  "relative flex items-center gap-1.5 py-2 text-[0.9375rem] transition-colors duration-200",
                  item.subMenus ? "pr-1 pl-3.5" : "px-3.5",
                  outlined
                    ? onGlass
                      ? "font-medium text-white"
                      : "font-medium text-ink"
                    : onGlass
                      ? "text-white/80 hover:text-white"
                      : "text-ink-muted hover:text-ink",
                )}
              >
                {outlined ? (
                  <Storefront size={16} weight="bold" className="relative z-10" />
                ) : null}
                <span className="relative z-10">{item.label}</span>
                {!outlined && (hovered === item.id || isOpen) ? (
                  <motion.span
                    layoutId="nav-hover"
                    aria-hidden="true"
                    transition={{ duration: 0.22, ease }}
                    className={cn(
                      "absolute inset-0 -right-7 rounded-full",
                      onGlass ? "bg-white/15" : "bg-tint",
                    )}
                  />
                ) : null}
              </Link>
              {item.subMenus ? (
                <button
                  type="button"
                  ref={(node) => {
                    triggerRefs.current[item.label] = node;
                  }}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  aria-label={`${item.label} menu`}
                  onClick={(event) => toggleFromButton(item.label, event.detail === 0)}
                  className={cn(
                    "relative z-10 mr-1 grid size-7 place-items-center rounded-full transition-colors duration-200",
                    onGlass ? "text-white/80 hover:text-white" : "text-ink-muted hover:text-ink",
                  )}
                >
                  <CaretDown
                    size={13}
                    weight="bold"
                    className={cn("transition-transform duration-300", isOpen && "rotate-180")}
                  />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* The one panel. pt-3 is a hover bridge, not visual padding. */}
      <div
        className={cn(
          "absolute top-full left-0 z-50 pt-3 transition-opacity duration-150",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{
          transform: `translate3d(${x}px, 0, 0)`,
          // Position glides between menus, but not on first open, where it would
          // slide in from the left edge.
          transition: `opacity 150ms ease-out, transform ${open && sizes[active ?? ""] ? 260 : 0}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
        onMouseEnter={() => {
          if (closeTimer.current) clearTimeout(closeTimer.current);
        }}
      >
        <div
          className="relative origin-top overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[0_20px_50px_-12px_rgb(15_23_42/0.18)]"
          style={{
            width: size ? size.w + 40 : undefined,
            height: size ? size.h + 40 : undefined,
            transition:
              "width 260ms cubic-bezier(0.16, 1, 0.3, 1), height 260ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {menus.map((item) => {
            const current = active === item.label;
            return (
              <div
                key={item.label}
                id={`nav-panel-${item.id}`}
                ref={(node) => {
                  contentRefs.current[item.label] = node;
                }}
                aria-hidden={!current || !open}
                inert={!current || !open}
                className={cn(
                  "absolute top-5 left-5 flex w-max gap-10 transition-opacity duration-200",
                  current && open ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                {item.subMenus?.map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-4 text-[0.75rem] font-medium tracking-[0.08em] text-ink-faint uppercase">
                      {group.title}
                    </h3>
                    <ul className="space-y-4">
                      {group.items.map((entry) => {
                        const Icon = entry.icon;
                        return (
                          <li key={entry.label}>
                            <Link
                              href={entry.href}
                              onClick={() => setOpen(false)}
                              {...(entry.external
                                ? { target: "_blank", rel: "noopener noreferrer" }
                                : {})}
                              className="group/item flex items-start gap-3"
                            >
                              <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] border border-border text-ink transition-colors duration-300 group-hover/item:border-accent group-hover/item:bg-accent group-hover/item:text-on-accent">
                                <Icon size={18} weight="bold" />
                              </span>
                              <span className="w-max leading-5">
                                <span className="block text-[0.875rem] font-medium text-ink">
                                  {entry.label}
                                </span>
                                <span className="block text-[0.75rem] text-ink-faint transition-colors duration-300 group-hover/item:text-ink-muted">
                                  {entry.description}
                                </span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
