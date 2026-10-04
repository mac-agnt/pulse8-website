import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/layout/PageShell";
import { PageIntro } from "@/components/ui/PageIntro";
import { CategoryNav } from "@/components/shop/CategoryNav";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { categories, productsIn } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Defibrillators and first aid supplies | Pulse 8 shop",
  description:
    "AEDs, pads, batteries, cabinets and first aid kits, from the people who train your staff to use them.",
};

// The announcement bar in the page shell is date-anchored.
export const revalidate = 3600;

export default function ShopPage() {
  const groups = categories
    .map((category) => ({ category, items: productsIn(category.slug) }))
    .filter((group) => group.items.length > 0);

  return (
    <PageShell>
      <PageIntro label="Online store" title="Defibrillators and first aid supplies">
        AEDs, pads, batteries, cabinets and first aid kits, from the people who train your
        staff to use them.
      </PageIntro>

      <div className="shell mt-10 md:mt-12">
        <CategoryNav />
      </div>

      <div className="shell mt-14 grid gap-14 md:mt-16 md:gap-16">
        {groups.map(({ category, items }) => (
          <section
            key={category.slug}
            id={category.slug}
            aria-labelledby={`${category.slug}-heading`}
            className="border-t border-border-soft pt-10 first:border-t-0 first:pt-0 md:pt-12"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <h2
                  id={`${category.slug}-heading`}
                  className="text-2xl leading-tight font-semibold sm:text-[1.75rem]"
                >
                  {category.name}
                </h2>
                <p className="mt-2 max-w-[56ch] text-ink-muted">{category.description}</p>
              </div>

              {items.length > 4 ? (
                <Link
                  href={`/shop/${category.slug}`}
                  className="group inline-flex items-center gap-1.5 text-[0.9375rem] font-medium whitespace-nowrap text-ink transition-colors duration-200 hover:text-accent"
                >
                  View all<span className="sr-only"> {category.name}</span>
                  <ArrowRight
                    size={15}
                    weight="bold"
                    className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                  />
                </Link>
              ) : null}
            </div>

            <ProductGrid products={items} className="mt-7" />
          </section>
        ))}
      </div>
    </PageShell>
  );
}
