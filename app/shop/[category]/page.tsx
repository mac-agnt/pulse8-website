import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PageIntro } from "@/components/ui/PageIntro";
import { CategoryNav } from "@/components/shop/CategoryNav";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { contact } from "@/lib/data";
import { categories, getCategory, productsIn } from "@/lib/shop";

// The announcement bar in the page shell is date-anchored.
export const revalidate = 3600;

type Props = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};
  return {
    title: `${category.name} | Pulse 8 shop`,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const items = productsIn(category.slug);

  return (
    <PageShell>
      <PageIntro
        back={{ href: "/shop", label: "All products" }}
        label="Online store"
        title={category.name}
      >
        {category.description}
      </PageIntro>

      <div className="shell mt-10 md:mt-12">
        <CategoryNav active={category.slug} />

        <h2 className="sr-only">Products</h2>
        {items.length > 0 ? (
          <ProductGrid products={items} className="mt-10 md:mt-12" />
        ) : (
          <p className="mt-10 rounded-[var(--radius-card)] border border-dashed border-border px-6 py-10 text-center text-ink-muted">
            Nothing in this category right now. Call us on{" "}
            <a href={contact.phoneHref} className="figure text-ink underline underline-offset-4">
              {contact.phone}
            </a>{" "}
            and we will source it.
          </p>
        )}
      </div>
    </PageShell>
  );
}
