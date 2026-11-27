"use client";

import { useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/admin/types";
import { Card } from "@/components/admin/Field";
import { Notice } from "@/components/admin/ui";
import { adminApi } from "@/components/admin/api";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Who changed what, newest first. */
export function ActivityPanel() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    adminApi<AuditEntry[]>("/api/admin/activity").then(setEntries, (cause: Error) => setError(cause.message));
  }, []);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!entries) return <p className="text-[0.875rem] text-ink-faint">Loading…</p>;

  const term = query.trim().toLowerCase();
  const shown = term ? entries.filter((entry) => `${entry.actorName} ${entry.summary}`.toLowerCase().includes(term)) : entries;

  return (
    <Card
      title="Recent changes"
      description="Every change to prices, dates, content and logins, with who made it."
      action={
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter"
          aria-label="Filter the activity"
          className="w-36 rounded-[var(--radius-control)] border border-border bg-bg px-2.5 py-1.5 text-[0.8125rem] text-ink outline-none focus:border-accent"
        />
      }
    >
      {shown.length === 0 ? (
        <p className="text-[0.875rem] text-ink-faint">Nothing yet.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border">
          {shown.map((entry) => (
            <li key={entry.id} className="grid gap-1 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[9.5rem_8rem_1fr] sm:gap-4">
              <span className="figure text-[0.75rem] text-ink-faint">{when(entry.at)}</span>
              <span className="truncate text-[0.8125rem] font-medium text-ink">{entry.actorName}</span>
              <span className="text-[0.8125rem] text-ink-muted">{entry.summary}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
