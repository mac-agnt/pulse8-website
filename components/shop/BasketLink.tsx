"use client";

import Link from "next/link";
import { ShoppingBag } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useBasket } from "@/lib/basket";

/**
 * Header control for the basket.
 *
 * Same 40px round control as the header's menu button, with the same two
 * skins for the glass and the solid bar. The count badge only appears once the
 * saved basket has been read, so the server render never shows a number.
 */
export function BasketLink({
  onGlass = false,
  className,
}: {
  onGlass?: boolean;
  className?: string;
}) {
  const { count } = useBasket();

  const label =
    count === 0 ? "Basket" : `Basket, ${count} ${count === 1 ? "item" : "items"}`;

  return (
    <Link
      href="/cart"
      aria-label={label}
      className={cn(
        "relative grid size-10 shrink-0 place-items-center rounded-full border transition-colors duration-200",
        onGlass
          ? "border-white/25 text-white hover:border-white/60"
          : "border-border text-ink hover:border-ink-faint",
        className,
      )}
    >
      <ShoppingBag size={18} weight="bold" />

      {count > 0 ? (
        <span
          aria-hidden="true"
          className="figure absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.6875rem] leading-none font-semibold text-on-accent"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
