"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowSquareOut,
  CalendarBlank,
  CheckCircle,
  ClockCounterClockwise,
  CurrencyEur,
  FloppyDisk,
  Gauge,
  GraduationCap,
  MagnifyingGlass,
  Notebook,
  Sidebar as SidebarIcon,
  TextAa,
  UserCircle,
  Users,
  Warning,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { SiteContent } from "@/lib/content";
import { Sidebar, type NavGroupData } from "@/components/admin/Sidebar";
import { OverviewPanel } from "@/components/admin/OverviewPanel";
import { CoursesPanel } from "@/components/admin/CoursesPanel";
import { CopyPanel } from "@/components/admin/CopyPanel";
import { DatesPanel } from "@/components/admin/DatesPanel";
import { PricesPanel } from "@/components/admin/PricesPanel";
import { StaffPanel } from "@/components/admin/StaffPanel";
import { ActivityPanel } from "@/components/admin/ActivityPanel";
import { AccountPanel, signOut } from "@/components/admin/AccountPanel";
import type { StaffSummary } from "@/lib/admin/types";

type SaveState = "idle" | "saving" | "saved" | "error";

const TITLES: Record<string, string> = {
  overview: "Overview",
  prices: "Prices",
  dates: "Course dates",
  courses: "Course descriptions",
  copy: "Site copy",
  staff: "Staff logins",
  activity: "Activity",
  account: "Your account",
};

/** Panels whose edits are held in this page's draft and saved with the top bar's button. */
const DRAFT_PANELS = new Set(["courses", "copy"]);

const INTROS: Record<string, string> = {
  prices: "What Pulse 8 charges online. Only what you change is saved.",
  dates: "Your dates on the booking page. Every save is live straight away.",
  staff: "Who can sign in to this admin.",
  activity: "Who changed what, newest first.",
  account: "Your login.",
};

type Versions = { copy: number; courses: number };

/**
 * The dashboard.
 *
 * Prices, Course dates, Staff and Activity load and save on their own. Course
 * descriptions and site copy share one draft held here, saved with the top
 * bar's button, so a half-typed headline never reaches the site; the save
 * names the versions it started from, and a clash with someone else's save
 * is reported instead of overwriting it.
 */
export function AdminShell({
  user,
  initialContent,
  initialVersions,
}: {
  user: StaffSummary;
  initialContent: SiteContent;
  initialVersions: Versions;
}) {
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(initialContent);
  const [versions, setVersions] = useState(initialVersions);
  const [panel, setPanel] = useState("overview");
  const [navOpen, setNavOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(saved),
    [content, saved],
  );

  const patch = (values: Partial<SiteContent>) =>
    setContent((current) => ({ ...current, ...values }));

  /** "copy:copy-hero" opens the copy panel and scrolls to that block. */
  const go = (id: string) => {
    const [target, anchor] = id.split(":");
    setPanel(target);
    if (!anchor) return;
    requestAnimationFrame(() =>
      document.getElementById(anchor)?.scrollIntoView({ block: "start" }),
    );
  };

  const save = useCallback(async () => {
    if (!dirty) return;
    setState("saving");
    setError(null);
    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, versions }),
      });
      if (response.status === 401) {
        window.location.assign("/admin/login");
        return;
      }
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(detail?.error ?? `Save failed (${response.status})`);
      }
      const next = (await response.json()) as { content: SiteContent; versions: Versions };
      setContent(next.content);
      setSaved(next.content);
      setVersions(next.versions);
      setState("saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed");
      setState("error");
    }
  }, [content, versions, dirty]);

  // Command palette and save both hang off the keyboard, the way an editor
  // working through a long list of courses would expect.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  useEffect(() => {
    if (state !== "saved") return;
    const timer = setTimeout(() => setState("idle"), 2400);
    return () => clearTimeout(timer);
  }, [state]);

  // Leaving with unsaved edits is the one way to lose work here.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const groups: NavGroupData[] = [
    {
      items: [
        { id: "overview", title: "Overview", icon: Gauge },
        { id: "prices", title: "Prices", icon: CurrencyEur },
        { id: "dates", title: "Course dates", icon: CalendarBlank },
      ],
    },
    {
      heading: "Website",
      items: [
        { id: "courses", title: "Course descriptions", icon: GraduationCap, badge: content.courses.length },
        {
          id: "copy",
          title: "Site copy",
          icon: TextAa,
          children: [
            { id: "copy:copy-hero", title: "Hero", icon: Notebook },
            { id: "copy:copy-numbers", title: "Numbers", icon: Notebook },
            { id: "copy:copy-steps", title: "Booking steps", icon: Notebook },
          ],
        },
      ],
    },
    {
      heading: "Admin",
      items: [
        ...(user.role === "owner" ? [{ id: "staff", title: "Staff logins", icon: Users }] : []),
        { id: "activity", title: "Activity", icon: ClockCounterClockwise },
        { id: "account", title: "Your account", icon: UserCircle },
      ],
    },
  ];

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const pages = Object.entries(TITLES)
      .filter(([id]) => id !== "staff" || user.role === "owner")
      .map(([id, title]) => ({
      id,
      title,
      detail: "Section",
    }));
    const courses = content.courses.map((course) => ({
      id: "courses",
      title: course.title,
      detail: course.delivery,
    }));
    const all = [...pages, ...courses];
    if (!term) return all.slice(0, 8);
    return all
      .filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(term))
      .slice(0, 8);
  }, [content.courses, query, user.role]);

  const lastSaved = saved.updatedAt
    ? new Date(saved.updatedAt).toLocaleString("en-IE", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-bg">
      <aside
        className={cn(
          "hidden h-full shrink-0 overflow-hidden border-r border-border transition-[width] duration-300 ease-out md:block",
          navOpen ? "w-[268px]" : "w-0 border-r-0",
        )}
      >
        <Sidebar
          groups={groups}
          activeId={panel}
          onSelect={go}
          onSearch={() => setSearchOpen(true)}
          savedLabel={`${user.name} · ${user.role === "owner" ? "Owner" : "Staff"}`}
          onSignOut={() => void signOut()}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={navOpen ? "Hide navigation" : "Show navigation"}
              onClick={() => setNavOpen(!navOpen)}
              className="hidden size-9 place-items-center rounded-[8px] text-ink-muted transition-colors hover:bg-tint hover:text-ink md:grid"
            >
              <SidebarIcon size={17} />
            </button>
            <p className="flex min-w-0 items-center gap-2 text-[0.875rem] text-ink-muted">
              <span className="hidden sm:inline">Pulse 8</span>
              <span className="hidden sm:inline text-ink-faint">/</span>
              <span className="truncate font-medium text-ink">{TITLES[panel]}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="grid size-9 place-items-center rounded-[8px] text-ink-muted transition-colors hover:bg-tint hover:text-ink md:hidden"
            >
              <MagnifyingGlass size={17} />
            </button>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-[var(--radius-control)] border border-border px-3 py-2 text-[0.8125rem] font-medium text-ink-muted transition-colors hover:border-ink-faint hover:text-ink sm:flex"
            >
              <ArrowSquareOut size={15} />
              View site
            </a>

            {DRAFT_PANELS.has(panel) || dirty ? (
            <button
              type="button"
              onClick={() => void save()}
              disabled={!dirty || state === "saving"}
              className={cn(
                "flex items-center gap-2 rounded-[var(--radius-control)] px-3.5 py-2 text-[0.8125rem] font-medium transition-colors",
                dirty
                  ? "bg-accent text-on-accent hover:bg-accent-strong"
                  : "bg-tint text-ink-faint",
              )}
            >
              {state === "saved" ? <CheckCircle size={15} weight="fill" /> : <FloppyDisk size={15} />}
              {state === "saving" ? "Saving" : state === "saved" ? "Saved" : "Save changes"}
            </button>
            ) : null}
          </div>
        </header>

        {state === "error" ? (
          <p className="flex items-center gap-2 border-b border-border bg-accent-soft px-6 py-2.5 text-[0.8125rem] text-accent-strong">
            <Warning size={15} weight="fill" />
            {error}
          </p>
        ) : null}

        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
          <div className="mx-auto w-full max-w-[1100px]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
                  {TITLES[panel]}
                </h1>
                <p className="mt-1 text-[0.875rem] text-ink-muted">
                  {DRAFT_PANELS.has(panel)
                    ? dirty
                      ? "Unsaved changes. Press ⌘S (Ctrl+S), or use Save changes."
                      : lastSaved
                        ? `Last saved ${lastSaved}.`
                        : "Nothing changed yet."
                    : INTROS[panel] ?? (dirty ? "Course descriptions or site copy have unsaved changes." : "")}
                </p>
              </div>
              <div className="flex gap-1 rounded-[var(--radius-control)] border border-border bg-surface p-1 md:hidden">
                {Object.entries(TITLES)
                  .filter(([id]) => id !== "staff" || user.role === "owner")
                  .map(([id, title]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPanel(id)}
                    className={cn(
                      "rounded-[7px] px-2.5 py-1.5 text-[0.75rem] font-medium transition-colors",
                      panel === id ? "bg-tint text-ink" : "text-ink-muted",
                    )}
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>

            {panel === "overview" ? <OverviewPanel name={user.name} onGo={go} /> : null}
            {panel === "prices" ? <PricesPanel /> : null}
            {panel === "dates" ? <DatesPanel /> : null}
            {panel === "courses" ? (
              <CoursesPanel courses={content.courses} onChange={(courses) => patch({ courses })} />
            ) : null}
            {panel === "copy" ? <CopyPanel content={content} onChange={patch} /> : null}
            {panel === "staff" && user.role === "owner" ? <StaffPanel currentUserId={user.id} /> : null}
            {panel === "activity" ? <ActivityPanel /> : null}
            {panel === "account" ? <AccountPanel user={user} /> : null}
          </div>
        </main>
      </div>

      {searchOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh]">
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
            className="absolute inset-0 bg-navy-deep/25 backdrop-blur-[2px]"
          />
          <div className="relative w-full max-w-xl overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border px-4">
              <MagnifyingGlass size={17} className="shrink-0 text-ink-faint" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Jump to a section or a course"
                className="flex-1 bg-transparent py-4 text-[0.9375rem] text-ink outline-none placeholder:text-ink-faint"
              />
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSearchOpen(false)}
                className="grid size-8 place-items-center rounded-[8px] text-ink-faint transition-colors hover:bg-tint hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {results.map((result, index) => (
                <li key={`${result.id}-${result.title}-${index}`}>
                  <button
                    type="button"
                    onClick={() => {
                      go(result.id);
                      setSearchOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-baseline justify-between gap-4 rounded-[8px] px-3 py-2.5 text-left transition-colors hover:bg-tint"
                  >
                    <span className="truncate text-[0.875rem] text-ink">{result.title}</span>
                    <span className="shrink-0 text-[0.75rem] text-ink-faint">{result.detail}</span>
                  </button>
                </li>
              ))}
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center text-[0.875rem] text-ink-faint">
                  Nothing matches that
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
