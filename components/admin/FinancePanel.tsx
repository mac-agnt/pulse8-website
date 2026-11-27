"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChartBar, Table, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/admin/Field";
import { Notice } from "@/components/admin/ui";
import { adminApi, formatWhen } from "@/components/admin/api";
import type { FinanceMode, FinanceRange, FinanceSource, FinanceSummary, PeriodBucket } from "@/lib/admin/finance";

/**
 * Finance: owners only. Every payment the website has taken, from course
 * bookings, Blended Learning bookings and the shop, laid out as charts.
 *
 * Colours: the three sources take fixed categorical slots (validated for
 * colour-blind separation), always in the same order, and every chart has a
 * legend plus a table view, so colour never carries identity alone.
 */

const SOURCE_ORDER: FinanceSource[] = ["classroom", "blended", "shop"];
const SOURCE_NAME: Record<FinanceSource, string> = {
  classroom: "Classroom courses",
  blended: "Blended Learning",
  shop: "Shop",
};
const SOURCE_COLOR: Record<FinanceSource, string> = {
  classroom: "var(--fin-classroom)",
  blended: "var(--fin-blended)",
  shop: "var(--fin-shop)",
};

const RANGES: Array<{ id: FinanceRange; label: string }> = [
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "12m", label: "12 months" },
  { id: "all", label: "All time" },
];

/** €1,234 or €1,234.50 */
export function euro(cents: number): string {
  const value = cents / 100;
  return `€${value.toLocaleString("en-IE", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** Axis labels: €0, €500, €1.5k */
function euroShort(cents: number): string {
  const value = cents / 100;
  if (value >= 1000) return `€${(value / 1000).toLocaleString("en-IE", { maximumFractionDigits: 1 })}k`;
  return `€${Math.round(value)}`;
}

function niceMax(value: number): number {
  if (value <= 0) return 10000;
  const exponent = Math.pow(10, Math.floor(Math.log10(value)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) if (step * exponent >= value) return step * exponent;
  return 10 * exponent;
}

function Swatch({ source }: { source: FinanceSource }) {
  return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-[3px]" style={{ background: SOURCE_COLOR[source] }} />;
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.75rem] text-ink-muted">
      {SOURCE_ORDER.map((source) => (
        <li key={source} className="flex items-center gap-1.5">
          <Swatch source={source} />
          {SOURCE_NAME[source]}
        </li>
      ))}
    </ul>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[var(--radius-control)] border border-border bg-surface p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-[8px] px-3 py-1.5 text-[0.8125rem] transition-colors",
            value === option.id ? "bg-tint font-medium text-ink" : "text-ink-muted hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* Revenue over time: stacked columns ------------------------------------- */

const CHART_H = 240;
const PAD = { top: 12, right: 8, bottom: 28, left: 52 };

function RevenueChart({ periods }: { periods: PeriodBucket[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = niceMax(Math.max(0, ...periods.map((p) => p.total)));
  const plotW = width - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const slot = plotW / Math.max(1, periods.length);
  const barW = Math.min(24, Math.max(3, slot * 0.6));
  const y = (cents: number) => PAD.top + plotH - (cents / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  // Thin the x labels so they never collide (about 56px each).
  const every = Math.max(1, Math.ceil(periods.length / Math.max(1, Math.floor(plotW / 56))));
  const GAP = 2;

  const active = hover !== null ? periods[hover] : null;
  const tipLeft = hover !== null ? PAD.left + slot * hover + slot / 2 : 0;

  return (
    <div ref={wrap} className="relative">
      <svg width={width} height={CHART_H} role="img" aria-label="Revenue over time by source. A table view is available." className="block">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--border-soft)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="figure fill-[var(--ink-faint)] text-[11px]">
              {euroShort(tick)}
            </text>
          </g>
        ))}
        {periods.map((period, index) => {
          const x = PAD.left + slot * index + (slot - barW) / 2;
          let base = PAD.top + plotH;
          const parts = SOURCE_ORDER.filter((s) => period[s] > 0);
          return (
            <g key={period.key}>
              {parts.map((source, i) => {
                const h = (period[source] / max) * plotH;
                const isTop = i === parts.length - 1;
                // 2px surface gap between stacked segments, never a stroke round them.
                const drawH = Math.max(1, h - (i > 0 ? GAP : 0));
                const segTop = base - h;
                base = segTop;
                const r = isTop ? Math.min(4, drawH / 2, barW / 2) : 0;
                const bottom = segTop + drawH;
                const path = r
                  ? `M${x},${bottom} V${segTop + r} Q${x},${segTop} ${x + r},${segTop} H${x + barW - r} Q${x + barW},${segTop} ${x + barW},${segTop + r} V${bottom} Z`
                  : `M${x},${bottom} V${segTop} H${x + barW} V${bottom} Z`;
                return (
                  <path
                    key={source}
                    d={path}
                    fill={SOURCE_COLOR[source]}
                    opacity={hover === null || hover === index ? 1 : 0.45}
                  />
                );
              })}
              {index % every === 0 ? (
                <text x={PAD.left + slot * index + slot / 2} y={CHART_H - 8} textAnchor="middle" className="fill-[var(--ink-faint)] text-[11px]">
                  {period.label}
                </text>
              ) : null}
              {/* Hit target: the whole column slot, taller and wider than the mark. */}
              <rect
                x={PAD.left + slot * index}
                y={PAD.top}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                tabIndex={period.total > 0 ? 0 : -1}
                aria-label={`${period.longLabel}: ${euro(period.total)}`}
              />
            </g>
          );
        })}
        <line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="var(--border)" strokeWidth={1} />
      </svg>
      {active ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-0 z-10 w-52 rounded-[10px] border border-border bg-surface p-3 text-[0.75rem] shadow-[0_8px_24px_-12px_rgb(15_23_42/0.35)]"
          style={{ left: Math.min(Math.max(0, tipLeft - 104), width - 208) }}
        >
          <p className="mb-2 font-semibold text-ink">{active.longLabel}</p>
          <ul className="flex flex-col gap-1">
            {SOURCE_ORDER.map((source) => (
              <li key={source} className="flex items-center justify-between gap-3 text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <Swatch source={source} />
                  {SOURCE_NAME[source]}
                </span>
                <span className="figure text-ink">{euro(active[source])}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex justify-between border-t border-border-soft pt-2 font-semibold text-ink">
            <span>Total</span>
            <span className="figure">{euro(active.total)}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

function RevenueTable({ periods }: { periods: PeriodBucket[] }) {
  const rows = [...periods].reverse();
  return (
    <div className="max-h-[320px] overflow-auto">
      <table className="w-full text-left text-[0.8125rem]">
        <thead className="sticky top-0 bg-surface text-[0.75rem] text-ink-faint">
          <tr>
            <th className="py-2 pr-3 font-medium">Period</th>
            {SOURCE_ORDER.map((s) => (
              <th key={s} className="py-2 pr-3 text-right font-medium">{SOURCE_NAME[s]}</th>
            ))}
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {rows.map((p) => (
            <tr key={p.key}>
              <td className="py-2 pr-3 text-ink">{p.longLabel}</td>
              {SOURCE_ORDER.map((s) => (
                <td key={s} className="figure py-2 pr-3 text-right text-ink-muted">{euro(p[s])}</td>
              ))}
              <td className="figure py-2 text-right font-medium text-ink">{euro(p.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* The panel -------------------------------------------------------------- */

export function FinancePanel() {
  const [range, setRange] = useState<FinanceRange>("12m");
  const [mode, setMode] = useState<FinanceMode | undefined>(undefined);
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"chart" | "table">("chart");

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({ range, ...(mode ? { mode } : {}) });
    adminApi<FinanceSummary>(`/api/admin/finance?${params}`).then(
      (next) => {
        if (!live) return;
        setData(next);
        setError(null);
      },
      (cause: Error) => live && setError(cause.message),
    );
    return () => {
      live = false;
    };
  }, [range, mode]);

  const delta = useMemo(() => {
    if (!data || data.previousNet === null) return null;
    if (data.previousNet === 0) return data.totals.net > 0 ? { up: true, text: "Up from €0 the period before" } : null;
    const change = ((data.totals.net - data.previousNet) / data.previousNet) * 100;
    // A huge percentage off a tiny base reads as noise; say what it grew from instead.
    if (change > 999) return { up: true, text: `Up from ${euro(data.previousNet)} the period before` };
    return { up: change >= 0, text: `${change >= 0 ? "Up" : "Down"} ${Math.abs(Math.round(change))}% on the period before` };
  }, [data]);

  const tiles = data
    ? [
        { label: "Revenue", value: euro(data.totals.net), note: delta },
        { label: "Payments", value: data.totals.payments.toLocaleString("en-IE"), note: null },
        { label: "Average payment", value: euro(data.totals.averageOrder), note: null },
        { label: "Refunded", value: euro(data.totals.refunded), note: null },
      ]
    : [];

  const totalNet = data?.totals.net ?? 0;
  const empty = data && data.totals.payments === 0;

  return (
    <div
      className="flex flex-col gap-5 [--fin-blended:#f47230] [--fin-classroom:#257de0] [--fin-shop:#00b894]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />
        {data && data.hasLive && data.hasTest ? (
          <Segmented
            label="Live or test payments"
            options={[
              { id: "live" as FinanceMode, label: "Live" },
              { id: "test" as FinanceMode, label: "Test" },
            ]}
            value={data.mode}
            onChange={setMode}
          />
        ) : null}
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {data?.mode === "test" ? (
        <Notice>
          These are <strong>test payments</strong>, made while Stripe is in test mode. No real money has changed hands. Real
          payments will show here, on their own, once payments are switched on.
        </Notice>
      ) : null}
      {data && data.attention.exceptions > 0 ? (
        <Notice tone="error">
          {data.attention.exceptions} {data.attention.exceptions === 1 ? "payment needs" : "payments need"} sorting out: the
          money was taken but something didn&apos;t match (for example, the date was full). Check Stripe and contact the customer.
        </Notice>
      ) : null}
      {data && data.attention.processing > 0 ? (
        <Notice>
          {data.attention.processing} {data.attention.processing === 1 ? "payment is" : "payments are"} still clearing (
          {euro(data.attention.processingAmount)}). {data.attention.processing === 1 ? "It's" : "They're"} not counted until the
          money arrives.
        </Notice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(data ? tiles : RANGES.map((r) => ({ label: r.id, value: "…", note: null }))).map((tile) => (
          <div key={tile.label} className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
            <p className="figure text-3xl font-semibold text-ink">{tile.value}</p>
            <p className="mt-2 text-[0.8125rem] text-ink-muted">{data ? tile.label : "Loading"}</p>
            {tile.note ? (
              <p className={cn("mt-1 flex items-center gap-1 text-[0.75rem]", tile.note.up ? "text-[oklch(42%_0.11_155)]" : "text-accent-strong")}>
                {tile.note.up ? <ArrowUpRight size={12} weight="bold" /> : <ArrowDownRight size={12} weight="bold" />}
                {tile.note.text}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <Card
        title="Revenue over time"
        description={
          data
            ? `${data.granularity === "day" ? "Per day" : data.granularity === "week" ? "Per week" : "Per month"}, after refunds. Hover a column for the breakdown.`
            : undefined
        }
        action={
          <button
            type="button"
            onClick={() => setView(view === "chart" ? "table" : "chart")}
            className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[0.75rem] text-ink-muted hover:bg-tint hover:text-ink"
          >
            {view === "chart" ? <Table size={14} /> : <ChartBar size={14} />}
            {view === "chart" ? "Show as table" : "Show as chart"}
          </button>
        }
      >
        <div className="mb-4">
          <Legend />
        </div>
        {!data ? (
          <div className="h-[240px] animate-pulse rounded-[10px] bg-tint" />
        ) : view === "chart" ? (
          <div className="relative">
            <RevenueChart periods={data.periods} />
            {empty ? (
              <p className="absolute inset-0 grid place-items-center text-center text-[0.875rem] text-ink-faint">
                No payments in this period yet.
              </p>
            ) : null}
          </div>
        ) : (
          <RevenueTable periods={data.periods} />
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Where it comes from" description="Revenue by source, after refunds.">
          {data ? (
            <>
              {/* One whole split into its parts, with 2px surface gaps. */}
              <div className="mb-4 flex h-3 w-full gap-[2px] overflow-hidden rounded-[4px] bg-tint">
                {totalNet > 0
                  ? data.bySource
                      .filter((s) => s.net > 0)
                      .map((s) => (
                        <div key={s.source} style={{ width: `${(s.net / totalNet) * 100}%`, background: SOURCE_COLOR[s.source] }} title={`${s.label}: ${euro(s.net)}`} />
                      ))
                  : null}
              </div>
              <ul className="flex flex-col divide-y divide-border-soft">
                {data.bySource.map((s) => (
                  <li key={s.source} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="flex items-center gap-2 text-[0.875rem] text-ink">
                      <Swatch source={s.source} />
                      {s.label}
                      <span className="text-[0.75rem] text-ink-faint">
                        {s.payments} {s.payments === 1 ? "payment" : "payments"}
                      </span>
                    </span>
                    <span className="flex items-baseline gap-3">
                      <span className="figure text-[0.75rem] text-ink-faint">{totalNet > 0 ? `${Math.round((s.net / totalNet) * 100)}%` : "0%"}</span>
                      <span className="figure min-w-20 text-right text-[0.875rem] font-medium text-ink">{euro(s.net)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[0.875rem] text-ink-faint">Loading…</p>
          )}
        </Card>

        <Card title="Top courses" description="By revenue, with places sold.">
          <BarList
            rows={(data?.topCourses ?? []).map((c) => ({ key: c.title + c.source, title: c.title, detail: `${c.places} ${c.places === 1 ? "place" : "places"}`, value: c.net, source: c.source }))}
            loading={!data}
            empty="No course bookings in this period yet."
          />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Top shop products" description="By revenue, with quantity sold.">
          <BarList
            rows={(data?.topProducts ?? []).map((p) => ({ key: p.title, title: p.title, detail: `${p.quantity} sold`, value: p.net, source: "shop" as FinanceSource }))}
            loading={!data}
            empty="No shop sales in this period yet."
          />
        </Card>

        <Card title="Latest payments" description="Newest first, after any refund.">
          {!data ? (
            <p className="text-[0.875rem] text-ink-faint">Loading…</p>
          ) : data.recent.length === 0 ? (
            <p className="text-[0.875rem] text-ink-faint">No payments in this period yet.</p>
          ) : (
            <ul className="flex max-h-[360px] flex-col divide-y divide-border-soft overflow-auto">
              {data.recent.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-ink">
                      <Swatch source={p.source} />
                      <span className="truncate">{p.description}</span>
                    </span>
                    <span className="block text-[0.75rem] text-ink-faint">
                      {p.customer} · {formatWhen(p.at)} · {p.id}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="figure block text-[0.8125rem] font-medium text-ink">{euro(p.net)}</span>
                    {p.refunded > 0 ? (
                      <span className="figure block text-[0.6875rem] text-accent-strong">{euro(p.refunded)} refunded</span>
                    ) : null}
                    {p.status === "exception" ? (
                      <span className="flex items-center justify-end gap-1 text-[0.6875rem] text-accent-strong">
                        <Warning size={11} weight="fill" /> Needs sorting
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-[0.75rem] text-ink-faint">
        Payments taken through the website by card (Stripe), in Irish time. Refunds come off the payment they belong to. Only
        owners can see this page; staff logins can&apos;t see payments or amounts anywhere in the admin.
      </p>
    </div>
  );
}

function BarList({
  rows,
  loading,
  empty,
}: {
  rows: Array<{ key: string; title: string; detail: string; value: number; source: FinanceSource }>;
  loading: boolean;
  empty: string;
}) {
  if (loading) return <p className="text-[0.875rem] text-ink-faint">Loading…</p>;
  if (rows.length === 0) return <p className="text-[0.875rem] text-ink-faint">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key} title={`${row.title}: ${euro(row.value)} (${row.detail})`}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-[0.8125rem] text-ink">{row.title}</span>
            <span className="figure shrink-0 text-[0.8125rem] font-medium text-ink">{euro(row.value)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 rounded-[4px] bg-tint">
              <div className="h-2 rounded-[4px]" style={{ width: `${Math.max(2, (row.value / max) * 100)}%`, background: SOURCE_COLOR[row.source] }} />
            </div>
            <span className="w-16 shrink-0 text-right text-[0.6875rem] text-ink-faint">{row.detail}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
