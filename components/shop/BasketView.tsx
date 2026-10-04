"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Trash } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { OrderReceived, OrderRequestForm } from "@/components/shop/OrderRequestForm";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { useBasket, useBasketReady, type BasketLine } from "@/lib/basket";
import { duration, ease } from "@/lib/motion";
import { formatMoney } from "@/lib/shop";

/** Placeholder in the shape of the filled basket, until the saved one is read. */
function BasketSkeleton() {
  return (
    <div className="grid animate-pulse gap-10 lg:grid-cols-12 lg:gap-12">
      <p className="sr-only" role="status">
        Loading your basket
      </p>
      <div aria-hidden="true" className="divide-y divide-border-soft border-y border-border-soft lg:col-span-7">
        {[0, 1].map((row) => (
          <div key={row} className="flex gap-4 py-5 sm:gap-5">
            <div className="size-20 shrink-0 rounded-[var(--radius-card)] bg-tint" />
            <div className="flex flex-1 flex-col gap-2.5 pt-1">
              <div className="h-4 w-2/3 rounded-full bg-tint" />
              <div className="h-3.5 w-1/4 rounded-full bg-tint" />
              <div className="mt-2 h-10 w-28 rounded-[var(--radius-control)] bg-tint" />
            </div>
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="h-72 rounded-[var(--radius-card)] border border-border bg-surface lg:col-span-5"
      />
    </div>
  );
}

function EmptyBasket() {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-border px-6 py-14 text-center">
      <ShoppingBag size={28} weight="bold" className="mx-auto text-ink-faint" />
      <h2 className="mt-4 text-xl font-semibold">Your basket is empty</h2>
      <p className="mx-auto mt-2 max-w-[42ch] text-ink-muted">
        Defibrillators, pads, batteries and first aid kits are all in the shop.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button href="/shop">Browse the shop</Button>
        <Button href="/courses" variant="secondary">
          See our courses
        </Button>
      </div>
    </div>
  );
}

function LineRow({
  line,
  onQuantity,
  onRemove,
}: {
  line: BasketLine;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const { product } = line;
  const href = `/product/${product.slug}`;

  return (
    <div className="flex gap-4 py-5 sm:gap-5">
      {/* The name below is the link people use; this one is for the pointer. */}
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="relative size-20 shrink-0 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface"
      >
        <Image src={product.images[0]} alt="" fill sizes="80px" className="object-contain p-2" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={href}
              className="line-clamp-2 leading-snug font-semibold text-ink underline-offset-4 hover:underline"
            >
              {product.name}
            </Link>
            {line.option && product.options ? (
              <p className="mt-1 text-[0.875rem] text-ink-muted">
                {product.options.name}: {line.option}
              </p>
            ) : null}
            <p className="mt-1 text-[0.875rem] text-ink-muted">
              <span className="figure">{formatMoney(product.price)}</span> each
            </p>
          </div>
          <p className="figure shrink-0 font-semibold text-ink">{formatMoney(line.lineTotal)}</p>
        </div>

        <div className="flex items-center gap-2">
          <QuantityStepper
            size="md"
            value={line.quantity}
            onChange={onQuantity}
            name={product.name}
          />
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${product.name}`}
            className="grid size-10 place-items-center rounded-[var(--radius-control)] text-ink-muted transition-colors duration-200 hover:bg-tint hover:text-ink"
          >
            <Trash size={18} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The basket page body.
 *
 * Before hydration the basket always reads as empty, so this shows a skeleton
 * until the saved basket is in, rather than flashing "empty" at someone who
 * has items. Lines on the left, a sticky summary with the order request form
 * on the right. Every change is announced through one polite live region.
 */
export function BasketView() {
  const ready = useBasketReady();
  const { lines, count, subtotal, setQuantity, remove } = useBasket();
  const [sent, setSent] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // The live region stays first and mounted across every state, so the
  // announcement for removing the last line is not lost when the view swaps.
  const live = (
    <p className="sr-only" role="status" aria-live="polite">
      {announcement}
    </p>
  );

  if (sent) {
    return (
      <>
        {live}
        <OrderReceived />
      </>
    );
  }

  if (!ready) {
    return (
      <>
        {live}
        <BasketSkeleton />
      </>
    );
  }

  if (lines.length === 0) {
    return (
      <>
        {live}
        <EmptyBasket />
      </>
    );
  }

  return (
    <>
      {live}
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <section aria-labelledby="basket-items" className="lg:col-span-7">
          <h2 id="basket-items" className="sr-only">
            Items in your basket
          </h2>
          <ul className="relative divide-y divide-border-soft border-y border-border-soft">
            <AnimatePresence initial={false} mode="popLayout">
              {lines.map((line) => (
                <motion.li
                  key={line.key}
                  layout
                  exit={{ opacity: 0 }}
                  transition={{ duration: duration.fast, ease }}
                >
                  <LineRow
                    line={line}
                    onQuantity={(quantity) => {
                      setQuantity(line.key, quantity);
                      setAnnouncement(`${line.product.name}, quantity ${quantity}.`);
                    }}
                    onRemove={() => {
                      remove(line.key);
                      setAnnouncement(
                        lines.length === 1
                          ? `Removed ${line.product.name}. Your basket is empty.`
                          : `Removed ${line.product.name}.`,
                      );
                    }}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>

        <aside
          aria-labelledby="basket-summary"
          className="lg:sticky lg:top-[calc(6.5rem+var(--header-offset))] lg:col-span-5 lg:self-start"
        >
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8">
            <h2 id="basket-summary" className="text-xl font-semibold">
              Summary
            </h2>

            <dl className="mt-5 grid gap-3 text-[0.9375rem]">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">Items</dt>
                <dd className="figure text-ink">{count}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-border-soft pt-3">
                <dt className="font-medium text-ink">Subtotal</dt>
                <dd className="figure text-2xl font-semibold text-ink">{formatMoney(subtotal)}</dd>
              </div>
            </dl>

            <p className="mt-4 text-[0.875rem] leading-relaxed text-ink-muted">
              Delivery and payment are confirmed by email before anything ships.
            </p>

            <div className="mt-7 border-t border-border-soft pt-7">
              <h3 className="mb-5 text-base font-semibold">Your details</h3>
              <OrderRequestForm lines={lines} subtotal={subtotal} onSent={() => setSent(true)} />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
