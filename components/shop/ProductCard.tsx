import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatMoney, getCategory, type Product } from "@/lib/shop";

/**
 * Product card for the shop grids.
 *
 * The packshots are square on white, so the image well is white too and well
 * padded: the product floats on the card rather than sitting in a box. The
 * whole card is one link. The image alt is empty because the product name is
 * already the link text, and reading it twice helps nobody.
 */
export function ProductCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const category = getCategory(product.category);

  return (
    <Link
      href={`/product/${product.slug}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgb(15_23_42/0.15)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <div className="aspect-square shrink-0 overflow-hidden p-4 sm:p-6">
        <div className="relative size-full">
          <Image
            src={product.images[0]}
            alt=""
            fill
            sizes="(min-width: 1280px) 270px, (min-width: 1024px) 22vw, (min-width: 768px) 30vw, 46vw"
            className="object-contain transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 sm:px-5 sm:pb-5">
        {category ? (
          <p className="text-[0.8125rem] text-ink-faint">{category.name}</p>
        ) : null}
        <h3 className="mt-1 line-clamp-2 text-[0.9375rem] leading-snug font-semibold text-ink sm:text-base">
          {product.name}
        </h3>
        <p className="figure mt-auto pt-3 text-[1.0625rem] font-semibold text-ink">
          {formatMoney(product.price)}
        </p>
      </div>
    </Link>
  );
}
