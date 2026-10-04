import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft, EnvelopeSimple, Phone, Storefront } from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/layout/PageShell";
import { AddToBasket } from "@/components/shop/AddToBasket";
import { ProductDescription } from "@/components/shop/ProductDescription";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { contact } from "@/lib/data";
import {
  formatMoney,
  getCategory,
  getProduct,
  products,
  productsIn,
  type Product,
} from "@/lib/shop";

// The announcement bar in the page shell is date-anchored.
export const revalidate = 3600;

const SITE = "https://pulse8.ie";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

/** First paragraph of the copy, cut at a word near search-snippet length. */
function summary(product: Product): string {
  const first = product.description.find((block) => block.type === "p");
  const text =
    first?.type === "p"
      ? first.text
      : `${product.name}, ${formatMoney(product.price)}, from the Pulse 8 online store.`;
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).replace(/\s+\S*$/, "")}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return {
    title: `${product.name} | Pulse 8`,
    description: summary(product),
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: `${product.name} | Pulse 8`,
      description: summary(product),
      url: `/product/${product.slug}`,
      images: [{ url: product.images[0], width: 1000, height: 1000, alt: product.name }],
    },
  };
}

/**
 * Up to four more from the same category. A category with fewer than two
 * others is topped up from the rest of the catalogue, in catalogue order.
 */
function relatedTo(product: Product): { items: Product[]; sameCategory: boolean } {
  const siblings = productsIn(product.category).filter((item) => item.slug !== product.slug);
  if (siblings.length >= 2) return { items: siblings.slice(0, 4), sameCategory: true };

  const others = products.filter((item) => item.category !== product.category);
  return { items: [...siblings, ...others].slice(0, 4), sameCategory: false };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const category = getCategory(product.category);
  if (!category) notFound();

  const related = relatedTo(product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((src) => `${SITE}${src}`),
    description: summary(product),
    category: category.name,
    offers: {
      "@type": "Offer",
      url: `${SITE}/product/${product.slug}`,
      price: product.price.toFixed(2),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="shell">
        <Link
          href={`/shop/${category.slug}`}
          className="group mb-6 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-ink-muted transition-colors duration-200 hover:text-ink"
        >
          <CaretLeft
            size={14}
            weight="bold"
            className="transition-transform duration-200 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          />
          {category.name}
        </Link>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <ProductGallery images={product.images} name={product.name} className="lg:col-span-6" />

          <div className="lg:col-span-6">
            <h1 className="max-w-[24ch] text-3xl leading-[1.1] font-semibold tracking-[-0.032em] sm:text-4xl">
              {product.name}
            </h1>
            <p className="figure mt-5 text-3xl font-semibold text-ink">
              {formatMoney(product.price)}
            </p>

            <AddToBasket slug={product.slug} options={product.options} className="mt-8" />

            <ul className="mt-8 grid gap-3 text-[0.9375rem] text-ink-muted">
              <li className="flex items-start gap-3">
                <Storefront size={18} weight="bold" className="mt-0.5 shrink-0 text-ink-faint" />
                Ordered through Pulse 8, Dublin
              </li>
              <li className="flex items-start gap-3">
                <EnvelopeSimple
                  size={18}
                  weight="bold"
                  className="mt-0.5 shrink-0 text-ink-faint"
                />
                Delivery and payment confirmed by email before anything ships
              </li>
              <li className="flex items-start gap-3">
                <Phone size={18} weight="bold" className="mt-0.5 shrink-0 text-ink-faint" />
                <span>
                  Questions? Call{" "}
                  <a
                    href={contact.phoneHref}
                    className="figure font-medium text-ink underline underline-offset-4 transition-colors duration-200 hover:text-accent"
                  >
                    {contact.phone}
                  </a>
                </span>
              </li>
            </ul>

            {product.description.length > 0 ? (
              <section aria-labelledby="details-heading" className="mt-10 border-t border-border pt-8">
                <h2 id="details-heading" className="text-xl font-semibold">
                  Details
                </h2>
                <ProductDescription blocks={product.description} className="mt-5" />
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {related.items.length > 0 ? (
        <section aria-labelledby="related-heading" className="shell mt-20 md:mt-28">
          <div className="border-t border-border-soft pt-14 md:pt-16">
            <h2
              id="related-heading"
              className="text-2xl leading-tight font-semibold sm:text-[1.75rem]"
            >
              {related.sameCategory ? `More in ${category.name}` : "More from the shop"}
            </h2>
            <ProductGrid products={related.items} className="mt-7" />
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
