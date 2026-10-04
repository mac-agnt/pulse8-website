import Link from "next/link";
import { cn } from "@/lib/cn";
import { categories, type CategorySlug } from "@/lib/shop";

/**
 * Category links for the shop, in the same shape as the course filter tabs.
 *
 * These are links, not state: every category is its own page. On phones the
 * row scrolls sideways inside itself and bleeds to the screen edge; from
 * tablet up it wraps. Sits inside `.shell`.
 */
export function CategoryNav({
  active,
  className,
}: {
  active?: CategorySlug;
  className?: string;
}) {
  const items: Array<{ href: string; label: string; current: boolean }> = [
    { href: "/shop", label: "All products", current: active === undefined },
    ...categories.map((category) => ({
      href: `/shop/${category.slug}`,
      label: category.name,
      current: category.slug === active,
    })),
  ];

  return (
    <nav aria-label="Shop categories" className={cn("-mx-5 md:mx-0", className)}>
      {/* The vertical padding leaves room for the focus ring inside the scroller. */}
      <ul className="flex snap-x gap-2 overflow-x-auto scroll-px-5 px-5 py-1.5 [scrollbar-width:none] md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.href} className="shrink-0 snap-start">
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center rounded-[var(--radius-control)] border px-4 text-[0.9375rem] font-medium whitespace-nowrap transition-colors duration-200",
                item.current
                  ? "border-accent bg-accent text-on-accent"
                  : "border-border bg-surface text-ink-muted hover:border-ink-faint hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
