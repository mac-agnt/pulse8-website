import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "@/components/shop/ProductCard";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/shop";

/**
 * Grid of product cards: two across on a phone, three on a tablet, four on a
 * desktop. Each card rises in as it reaches the viewport, staggered across a
 * row; the cards themselves stay server rendered inside the reveal.
 */
export function ProductGrid({
  products,
  className,
}: {
  products: Product[];
  className?: string;
}) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4", className)}>
      {products.map((product, index) => (
        <Reveal key={product.slug} as="li" delay={(index % 4) * 0.04}>
          <ProductCard product={product} />
        </Reveal>
      ))}
    </ul>
  );
}
