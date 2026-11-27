"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowSquareOut, FloppyDisk, MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { DeliveryRates } from "@/lib/shop-delivery";
import { Card, Field, TextArea } from "@/components/admin/Field";
import { AdminButton, Badge, EuroInput, Notice } from "@/components/admin/ui";
import { adminApi, formatWhen } from "@/components/admin/api";

type PricesData = {
  classroom: Array<{ slug: string; title: string; delivery: string; draft: boolean; price: number | null }>;
  online: Array<{ slug: string; title: string }>;
  blended: Array<{ id: string; title: string; price: number | null; dates: number }> | null;
  blendedAdminUrl: string | null;
  shop: Array<{ slug: string; name: string; category: string; image: string | null; price: number }>;
  delivery: DeliveryRates;
  vatNote: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

type Tab = "courses" | "shop" | "delivery";

const show = (value: number | null | undefined) => (typeof value === "number" ? String(value) : "");
const normal = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const number = Number(trimmed);
  return Number.isFinite(number) ? String(Math.round(number * 100) / 100) : trimmed;
};

/**
 * Prices. Everything Pulse 8 charges online, in one place: classroom courses
 * (blank means "Enquire": no online booking), shop products, delivery and the
 * VAT line. Blended courses are priced in Blended Learning's own admin and
 * only shown here. Nothing saves until "Save prices"; only what changed is sent.
 */
export function PricesPanel() {
  const [data, setData] = useState<PricesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("courses");
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<Record<string, string>>({});
  const [shop, setShop] = useState<Record<string, string>>({});
  const [flat, setFlat] = useState("");
  const [freeOver, setFreeOver] = useState("");
  const [vatNote, setVatNote] = useState("");

  const apply = useCallback((next: PricesData) => {
    setData(next);
    setCourses(Object.fromEntries(next.classroom.map((course) => [course.slug, show(course.price)])));
    setShop(Object.fromEntries(next.shop.map((product) => [product.slug, show(product.price)])));
    setFlat(show(next.delivery.flatEuro));
    setFreeOver(show(next.delivery.freeOverEuro));
    setVatNote(next.vatNote);
    setError(null);
  }, []);
  const fail = useCallback((cause: Error) => setError(cause.message), []);
  const load = useCallback(() => adminApi<PricesData>("/api/admin/prices").then(apply, fail), [apply, fail]);

  useEffect(() => {
    adminApi<PricesData>("/api/admin/prices").then(apply, fail);
  }, [apply, fail]);

  const changes = useMemo(() => {
    if (!data) return null;
    const courseChanges = Object.fromEntries(
      data.classroom
        .filter((course) => normal(courses[course.slug] ?? "") !== show(course.price))
        .map((course) => [course.slug, normal(courses[course.slug] ?? "") || null]),
    );
    const shopChanges = Object.fromEntries(
      data.shop
        .filter((product) => normal(shop[product.slug] ?? "") !== show(product.price))
        .map((product) => [product.slug, normal(shop[product.slug] ?? "")]),
    );
    const deliveryChanged =
      normal(flat) !== show(data.delivery.flatEuro) || normal(freeOver) !== show(data.delivery.freeOverEuro);
    const vatChanged = vatNote.trim() !== data.vatNote;
    return {
      courses: courseChanges,
      shop: shopChanges,
      deliveryChanged,
      vatChanged,
      count:
        Object.keys(courseChanges).length +
        Object.keys(shopChanges).length +
        (deliveryChanged ? 1 : 0) +
        (vatChanged ? 1 : 0),
    };
  }, [data, courses, shop, flat, freeOver, vatNote]);

  const save = async (confirmDelivery = false) => {
    if (!changes) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await adminApi("/api/admin/prices", {
        method: "PUT",
        json: {
          ...(Object.keys(changes.courses).length ? { courses: changes.courses } : {}),
          ...(Object.keys(changes.shop).length ? { shop: changes.shop } : {}),
          ...(changes.deliveryChanged || confirmDelivery
            ? { delivery: { flatEuro: normal(flat) || 0, freeOverEuro: normal(freeOver) || null } }
            : {}),
          ...(changes.vatChanged ? { vatNote: vatNote.trim() } : {}),
        },
      });
      await load();
      setNotice("Saved. The new prices apply to the next booking or order.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Leaving with unsaved prices is the one way to lose work here.
  useEffect(() => {
    if (!changes?.count) return;
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [changes?.count]);

  if (!data) {
    return error ? <Notice tone="error">{error}</Notice> : <p className="text-[0.875rem] text-ink-faint">Loading prices…</p>;
  }

  const term = query.trim().toLowerCase();
  const products = term
    ? data.shop.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(term))
    : data.shop;
  const groups = [...new Set(products.map((product) => product.category))];
  const enquireCount = data.classroom.filter((course) => !normal(courses[course.slug] ?? "")).length;

  return (
    <div className="flex flex-col gap-5 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-[var(--radius-control)] border border-border bg-surface p-1" role="tablist">
          {(
            [
              ["courses", "Courses"],
              ["shop", "Shop products"],
              ["delivery", "Delivery and VAT"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-[7px] px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                tab === id ? "bg-tint text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {data.updatedAt ? (
          <p className="text-[0.75rem] text-ink-faint">
            Last changed {formatWhen(data.updatedAt)}
            {data.updatedBy ? ` by ${data.updatedBy}` : ""}
          </p>
        ) : null}
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {notice && !changes?.count ? <Notice tone="success">{notice}</Notice> : null}

      {tab === "courses" ? (
        <>
          <Card
            title="Courses Pulse 8 runs"
            description="Classroom and blended courses, euro per person, including VAT where it applies. Leave a price blank and the course shows “Enquire” instead of “Book”. A date can have its own price (Course dates)."
            action={enquireCount ? <Badge tone="muted">{enquireCount} on Enquire</Badge> : undefined}
          >
            <ul className="flex flex-col divide-y divide-border">
              {data.classroom.map((course) => {
                const value = courses[course.slug] ?? "";
                return (
                  <li key={course.slug} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[0.875rem] font-medium text-ink">{course.title}</span>
                      <span className="text-[0.75rem] text-ink-faint">
                        {course.delivery} · {course.draft ? "hidden from the site (draft)" : normal(value) ? "bookable online" : "Enquire only"}
                      </span>
                    </span>
                    <EuroInput
                      label={`${course.title} price`}
                      value={value}
                      changed={normal(value) !== show(course.price)}
                      onChange={(next) => setCourses({ ...courses, [course.slug]: next })}
                      className="max-w-36 shrink-0"
                    />
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card
            title="Blended Learning courses"
            description="Run through the Blended Learning app: their prices and practical days are set in its admin. Shown here so you can check them."
            action={
              data.blendedAdminUrl ? (
                <a
                  href={data.blendedAdminUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium whitespace-nowrap text-accent"
                >
                  Open Blended Learning admin <ArrowSquareOut size={14} />
                </a>
              ) : undefined
            }
          >
            {data.blended === null ? (
              <Notice>Blended Learning can&apos;t be reached right now, so its prices aren&apos;t shown.</Notice>
            ) : data.blended.length === 0 ? (
              <p className="text-[0.875rem] text-ink-faint">No blended courses are published.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.blended.map((course) => (
                  <li key={course.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[0.875rem] font-medium text-ink">{course.title}</span>
                      <span className="text-[0.75rem] text-ink-faint">
                        {course.dates} practical {course.dates === 1 ? "day" : "days"} listed
                      </span>
                    </span>
                    <span className="figure text-[0.9375rem] text-ink">
                      {course.price === null ? <Badge tone="muted">No price: Enquire</Badge> : `€${course.price}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {data.online.length ? (
            <Card title="Online courses" description="Sold and priced on Videotile, not on this website.">
              <p className="text-[0.875rem] text-ink-muted">{data.online.map((course) => course.title).join(" · ")}</p>
            </Card>
          ) : null}
        </>
      ) : null}

      {tab === "shop" ? (
        <Card
          title="Shop products"
          description="Euro each, as shown in the shop and charged at checkout."
          action={
            <label className="relative flex items-center">
              <MagnifyingGlass size={15} className="pointer-events-none absolute left-2.5 text-ink-faint" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a product"
                aria-label="Find a product"
                className="w-44 rounded-[var(--radius-control)] border border-border bg-bg py-1.5 pr-2.5 pl-8 text-[0.8125rem] text-ink outline-none focus:border-accent"
              />
            </label>
          }
        >
          {groups.map((group) => (
            <div key={group} className="mb-5 last:mb-0">
              <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">{group}</h3>
              <ul className="flex flex-col divide-y divide-border">
                {products
                  .filter((product) => product.category === group)
                  .map((product) => {
                    const value = shop[product.slug] ?? "";
                    return (
                      <li key={product.slug} className="flex items-center justify-between gap-3 py-2">
                        <span className="flex min-w-0 items-center gap-3">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt=""
                              width={40}
                              height={40}
                              className="size-10 shrink-0 rounded-[8px] border border-border bg-white object-contain"
                            />
                          ) : null}
                          <span className="truncate text-[0.875rem] text-ink">{product.name}</span>
                        </span>
                        <EuroInput
                          label={`${product.name} price`}
                          placeholder="Required"
                          value={value}
                          changed={normal(value) !== show(product.price)}
                          onChange={(next) => setShop({ ...shop, [product.slug]: next })}
                          className="max-w-32 shrink-0"
                        />
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
          {products.length === 0 ? <p className="text-[0.875rem] text-ink-faint">Nothing matches that.</p> : null}
        </Card>
      ) : null}

      {tab === "delivery" ? (
        <>
          <Card
            title="Delivery"
            description="Charged once per shop order. Orders are delivered within Ireland only (the checkout asks for an Eircode)."
            action={data.delivery.confirmed ? <Badge tone="good">Confirmed</Badge> : <Badge tone="warn">Not set yet</Badge>}
          >
            {!data.delivery.confirmed ? (
              <Notice className="mb-5">
                Delivery is still the placeholder (free), and staff emails flag each order. Enter the real rates and save to
                confirm them; if delivery really is free, leave 0 and press “Confirm delivery rates”.
              </Notice>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Delivery charge per order" hint="0 for free delivery.">
                <EuroInput label="Delivery charge" placeholder="0" value={flat} onChange={setFlat} changed={normal(flat) !== show(data.delivery.flatEuro)} />
              </Field>
              <Field label="Free delivery when the order is at least" hint="Leave blank if delivery is never free.">
                <EuroInput label="Free delivery over" placeholder="Never" value={freeOver} onChange={setFreeOver} changed={normal(freeOver) !== show(data.delivery.freeOverEuro)} />
              </Field>
            </div>
            {!data.delivery.confirmed && !changes?.count ? (
              <AdminButton variant="primary" className="mt-5" disabled={saving} onClick={() => void save(true)}>
                Confirm delivery rates
              </AdminButton>
            ) : null}
          </Card>

          <Card title="VAT note" description="One line shown under prices on product pages and in the basket.">
            <TextArea
              aria-label="VAT note"
              value={vatNote}
              maxLength={300}
              onChange={(event) => setVatNote(event.target.value)}
              className="min-h-16"
            />
          </Card>
        </>
      ) : null}

      {changes?.count ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:left-auto md:w-[calc(100%-268px)]">
          <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3">
            <p className="text-[0.875rem] text-ink">
              {changes.count} {changes.count === 1 ? "change" : "changes"} not saved yet
            </p>
            <div className="flex gap-2">
              <AdminButton variant="ghost" disabled={saving} onClick={() => void load()}>
                Undo
              </AdminButton>
              <AdminButton variant="primary" disabled={saving} icon={<FloppyDisk size={15} />} onClick={() => void save()}>
                {saving ? "Saving…" : "Save prices"}
              </AdminButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
