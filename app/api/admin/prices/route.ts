import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { actorOf, guard } from "@/lib/admin/auth.server";
import { adminStore } from "@/lib/admin/store.server";
import { composeContent } from "@/lib/content.server";
import { blendedCatalogue, blendedConfig } from "@/lib/blended/feed.server";
import { isPublished } from "@/lib/data";
import { ownCourses } from "@/lib/admin/dates.server";
import { categories, products } from "@/lib/shop";
import type { PricesDoc } from "@/lib/admin/types";
import { euro, invalid, money, moneyOrEnquire } from "@/lib/admin/validate.server";
import { multiLine } from "@/lib/validate.server";
import type { DeliveryRates } from "@/lib/shop-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Prices, for the Prices panel. Staff only: these figures never reach a
 * public page. Classroom courses and shop products are set here; blended
 * courses are shown as Blended Learning prices them (set in BL's admin).
 */
export async function GET(request: Request) {
  const { staff, response } = await guard(request);
  if (!staff) return response;

  const docs = await adminStore().readDocs();
  const content = composeContent(docs);
  const prices = docs.prices.data;
  const published = content.courses.filter(isPublished);
  const catalogue = await blendedCatalogue(published).catch(() => ({ ok: false as const }));
  const bl = blendedConfig();

  return NextResponse.json({
    classroom: ownCourses(content.courses).map((course) => ({
      slug: course.slug,
      title: course.title,
      delivery: course.delivery,
      draft: course.status === "draft",
      price: course.price ?? null,
    })),
    online: content.courses
      .filter((course) => course.delivery === "Online")
      .map((course) => ({ slug: course.slug, title: course.title })),
    blended: catalogue.ok
      ? catalogue.courses.map((item) => ({
          id: item.id,
          title: item.course.title,
          price: item.priceCents === null ? null : item.priceCents / 100,
          dates: item.sessions.length,
        }))
      : null,
    blendedAdminUrl: bl ? `${bl.baseUrl}/admin` : null,
    shop: products.map((product) => ({
      slug: product.slug,
      name: product.name,
      category: categories.find((category) => category.slug === product.category)?.name ?? product.category,
      image: product.images[0] ?? null,
      price: prices.shop[product.slug] ?? product.price,
    })),
    delivery: prices.delivery,
    vatNote: prices.vatNote,
    updatedAt: docs.prices.updatedAt,
    updatedBy: docs.prices.updatedBy,
  });
}

type Body = {
  courses?: Record<string, unknown>;
  shop?: Record<string, unknown>;
  delivery?: { flatEuro?: unknown; freeOverEuro?: unknown };
  vatNote?: unknown;
};

/**
 * Saves only what changed: PUT { courses?: { slug: euro | null }, shop?: { slug: euro },
 * delivery?: { flatEuro, freeOverEuro }, vatNote? }. Two people changing
 * different prices never overwrite each other. Each change goes in the log.
 */
export async function PUT(request: Request) {
  const { staff, response } = await guard(request);
  if (!staff) return response;
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Nothing to save." }, { status: 400 });

  const docs = await adminStore().readDocs();
  const titles = new Map(ownCourses(composeContent(docs).courses).map((course) => [course.slug, course.title] as const));
  const names = new Map(products.map((product) => [product.slug, product.name] as const));

  // Check everything before saving anything.
  const courseChanges: Array<[string, number | null]> = [];
  for (const [slug, raw] of Object.entries(body.courses ?? {})) {
    if (!titles.has(slug)) {
      return NextResponse.json({ error: `That course isn't priced here (online and Blended Learning courses are priced elsewhere).` }, { status: 400 });
    }
    const value = euro(raw);
    if (value === invalid) {
      return NextResponse.json({ error: `${titles.get(slug)}: enter a price in euro, or leave it blank for Enquire.` }, { status: 400 });
    }
    courseChanges.push([slug, value]);
  }
  const shopChanges: Array<[string, number]> = [];
  for (const [slug, raw] of Object.entries(body.shop ?? {})) {
    if (!names.has(slug)) return NextResponse.json({ error: `Unknown product: ${slug}` }, { status: 400 });
    const value = euro(raw);
    if (value === invalid || value === null) {
      return NextResponse.json({ error: `${names.get(slug)}: every product needs a price.` }, { status: 400 });
    }
    shopChanges.push([slug, value]);
  }
  let delivery: DeliveryRates | undefined;
  if (body.delivery) {
    const flat = body.delivery.flatEuro === 0 || body.delivery.flatEuro === "0" ? 0 : euro(body.delivery.flatEuro);
    const freeOver = euro(body.delivery.freeOverEuro);
    if (flat === invalid || freeOver === invalid) {
      return NextResponse.json({ error: "Delivery: enter amounts in euro (0 for free delivery)." }, { status: 400 });
    }
    delivery = { flatEuro: flat ?? 0, freeOverEuro: freeOver, confirmed: true };
  }
  let vatNote: string | undefined;
  if (body.vatNote !== undefined) {
    const note = multiLine(body.vatNote, 300);
    if (note === null) return NextResponse.json({ error: "The VAT note is too long (300 characters at most)." }, { status: 400 });
    vatNote = note;
  }

  const saved = await adminStore().updateDoc(
    "prices",
    (current) => {
      const next: PricesDoc = {
        ...current,
        courses: { ...current.courses },
        shop: { ...current.shop },
      };
      const audit: string[] = [];
      for (const [slug, value] of courseChanges) {
        const before = Object.hasOwn(current.courses, slug) ? current.courses[slug] : undefined;
        if (before === value) continue;
        next.courses[slug] = value;
        audit.push(`Course price, ${titles.get(slug)}: ${moneyOrEnquire(before)} → ${moneyOrEnquire(value)}`);
      }
      for (const [slug, value] of shopChanges) {
        const before = current.shop[slug] ?? products.find((product) => product.slug === slug)?.price;
        if (before === value) continue;
        next.shop[slug] = value;
        audit.push(`Shop price, ${names.get(slug)}: ${before === undefined ? "none" : money(before)} → ${money(value)}`);
      }
      if (delivery) {
        const before = current.delivery;
        if (
          before.flatEuro !== delivery.flatEuro ||
          before.freeOverEuro !== delivery.freeOverEuro ||
          !before.confirmed
        ) {
          next.delivery = delivery;
          const free = delivery.freeOverEuro === null ? "" : `, free over ${money(delivery.freeOverEuro)}`;
          audit.push(`Delivery: ${delivery.flatEuro > 0 ? money(delivery.flatEuro) : "free"} per order${free}`);
        }
      }
      if (vatNote !== undefined && vatNote !== current.vatNote) {
        next.vatNote = vatNote;
        audit.push(`VAT note: “${vatNote || "(none)"}”`);
      }
      return { data: next, audit };
    },
    { actor: actorOf(staff.user), action: "prices.update" },
  );

  if (shopChanges.length || delivery || vatNote !== undefined) {
    // Shop pages are cached for an hour; show the new prices on the next visit.
    revalidatePath("/shop", "layout");
    revalidatePath("/product/[slug]", "page");
  }
  return NextResponse.json({ ok: true, updatedAt: saved.updatedAt, updatedBy: saved.updatedBy });
}
