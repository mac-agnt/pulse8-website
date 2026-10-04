"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react";
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
 * Opens on hover or keyboard focus. Leaving the whole nav area closes it after
 * a short grace period, so crossing the gap between a label and the panel
 * does not flicker it shut. Escape closes. `onGlass` swaps the labels to white
 * for the transparent bar over the hero.
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

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [items]);

  function show(label: string | null) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const hasMenu = label ? items.some((i) => i.label === label && i.subMenus) : false;
    if (hasMenu && label) {
      setActive(label);
      setOpen(true);
    } else {
      setOpen(false);
    }
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
  const x = active ? (offsets[active] ?? 0) : 0;
  const menus = items.filter((item) => item.subMenus);

  return (
    <div
      className="relative"
      onMouseLeave={scheduleClose}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <ul className="relative flex items-center">
        {items.map((item) => {
          const isOpen = open && active === item.label;
          return (
            <li
              key={item.label}
              ref={(node) => {
                itemRefs.current[item.label] = node;
              }}
              onMouseEnter={() => {
                setHovered(item.id);
                show(item.label);
              }}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => show(item.label)}
            >
              <Link
                href={item.href}
                aria-haspopup={item.subMenus ? "menu" : undefined}
                aria-expanded={item.subMenus ? isOpen : undefined}
                className={cn(
                  "relative flex items-center gap-1 px-3.5 py-2 text-[0.9375rem] transition-colors duration-200",
                  onGlass ? "text-white/80 hover:text-white" : "text-ink-muted hover:text-ink",
                )}
              >
                <span className="relative z-10">{item.label}</span>
                {item.subMenus ? (
                  <CaretDown
                    size={13}
                    weight="bold"
                    className={cn(
                      "relative z-10 transition-transform duration-300",
                      isOpen && "rotate-180",
                    )}
                  />
                ) : null}
                {hovered === item.id || isOpen ? (
                  <motion.span
                    layoutId="nav-hover"
                    aria-hidden="true"
                    transition={{ duration: 0.22, ease }}
                    className={cn(
                      "absolute inset-0 rounded-full",
                      onGlass ? "bg-white/15" : "bg-tint",
                    )}
                  />
                ) : null}
              </Link>
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
