"use client";

import { useState } from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  CalendarBlank,
  CaretDown,
  CaretRight,
  Globe,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/**
 * Dashboard navigation.
 *
 * Groups with optional headings, one level of children on a hairline rail,
 * badges for counts and a shortcut hint that appears on hover. Phosphor icons,
 * because that is the family the rest of the site already uses.
 */

export type NavItemData = {
  id: string;
  title: string;
  icon: Icon;
  badge?: number | string;
  shortcut?: string;
  children?: NavItemData[];
};

export type NavGroupData = {
  heading?: string;
  items: NavItemData[];
};

function NavItem({
  item,
  activeId,
  onSelect,
  level = 0,
}: {
  item: NavItemData;
  activeId: string;
  onSelect: (id: string) => void;
  level?: number;
}) {
  const hasChildren = Boolean(item.children?.length);
  const isActive = activeId === item.id;
  const childActive = Boolean(item.children?.some((child) => child.id === activeId));
  const [isOpen, setIsOpen] = useState(childActive);

  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        onClick={() => {
          // A parent opens its own panel as well as its children, so the group
          // heading is never a dead click.
          if (hasChildren) setIsOpen(!isOpen);
          onSelect(item.id);
        }}
        style={{ paddingLeft: `${level * 12 + 10}px` }}
        className={cn(
          "group flex items-center justify-between rounded-[8px] py-[7px] pr-2.5 text-left transition-colors duration-200",
          isActive
            ? "bg-tint font-medium text-ink"
            : "text-ink-muted hover:bg-tint/70 hover:text-ink",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <item.icon
            size={16}
            weight={isActive ? "fill" : "regular"}
            className={cn(
              "shrink-0 transition-colors",
              isActive ? "text-accent" : "text-ink-faint group-hover:text-ink-muted",
            )}
          />
          <span className="truncate text-[0.8125rem]">{item.title}</span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {item.shortcut ? (
            <kbd className="hidden h-5 items-center rounded-[4px] border border-border bg-bg px-1.5 font-mono text-[10px] text-ink-faint group-hover:inline-flex">
              {item.shortcut}
            </kbd>
          ) : null}
          {item.badge !== undefined ? (
            <span className="figure inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-soft px-1.5 text-[10px] font-semibold text-accent-strong">
              {item.badge}
            </span>
          ) : null}
          {hasChildren ? (
            <CaretRight
              size={12}
              weight="bold"
              className={cn(
                "text-ink-faint transition-transform duration-200",
                isOpen && "rotate-90",
              )}
            />
          ) : null}
        </span>
      </button>

      {hasChildren ? (
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="relative mt-0.5 flex min-h-0 flex-col gap-0.5 overflow-hidden">
            <span
              aria-hidden="true"
              className="absolute top-0 bottom-0 border-l border-border"
              style={{ left: `${level * 12 + 18}px` }}
            />
            {item.children?.map((child) => (
              <NavItem
                key={child.id}
                item={child}
                activeId={activeId}
                onSelect={onSelect}
                level={level + 1}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({
  groups,
  activeId,
  onSelect,
  onSearch,
  savedLabel,
  className,
}: {
  groups: NavGroupData[];
  activeId: string;
  onSelect: (id: string) => void;
  onSearch: () => void;
  savedLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full w-[268px] flex-col bg-surface p-3", className)}>
      <div className="mb-3 flex items-center gap-3 rounded-[10px] px-2 py-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-navy text-[13px] font-semibold text-on-navy">
          P8
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[0.8125rem] leading-none font-semibold text-ink">
            Pulse 8
          </span>
          <span className="mt-1.5 text-[11px] leading-none text-ink-faint">{savedLabel}</span>
        </span>
        <CaretDown size={14} className="ml-auto shrink-0 text-ink-faint" />
      </div>

      <button
        type="button"
        onClick={onSearch}
        className="group mb-4 flex items-center gap-2.5 rounded-[8px] border border-border bg-bg px-2.5 py-2 text-left text-ink-faint transition-colors hover:border-ink-faint/60 hover:text-ink-muted"
      >
        <MagnifyingGlass size={15} />
        <span className="text-[0.8125rem]">Search</span>
        <kbd className="ml-auto h-5 rounded-[4px] border border-border px-1.5 font-mono text-[10px] leading-5">
          ⌘K
        </kbd>
      </button>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group, index) => (
          <div key={group.heading ?? index} className="flex flex-col gap-0.5">
            {group.heading ? (
              <span className="mb-1 px-2.5 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
                {group.heading}
              </span>
            ) : null}
            {group.items.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                activeId={activeId}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-2.5 rounded-[8px] py-[7px] pr-2.5 pl-2.5 text-ink-muted transition-colors hover:bg-tint/70 hover:text-ink"
        >
          <Globe size={16} className="shrink-0 text-ink-faint group-hover:text-ink-muted" />
          <span className="text-[0.8125rem]">Home page</span>
        </a>
        <a
          href="/book"
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-2.5 rounded-[8px] py-[7px] pr-2.5 pl-2.5 text-ink-muted transition-colors hover:bg-tint/70 hover:text-ink"
        >
          <CalendarBlank size={16} className="shrink-0 text-ink-faint group-hover:text-ink-muted" />
          <span className="text-[0.8125rem]">Booking page</span>
        </a>
      </div>
    </div>
  );
}
