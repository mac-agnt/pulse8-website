"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check } from "@phosphor-icons/react";
import { SubmitButton } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { cn } from "@/lib/cn";
import { useBasket } from "@/lib/basket";
import type { Product } from "@/lib/shop";

/**
 * Quantity and add to basket for the product page.
 *
 * A product with a required choice (glove size) shows it first as a row of
 * chips, and the button stays off until one is picked. After an add the
 * button reads "Added" for a moment, a link to the basket appears, and the
 * same line is announced to screen readers.
 */
export function AddToBasket({
  slug,
  options,
  className,
}: {
  slug: string;
  options?: Product["options"];
  className?: string;
}) {
  const { add } = useBasket();
  const [quantity, setQuantity] = useState(1);
  const [choice, setChoice] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  // Counts adds, so a repeat add restarts the timer and is announced again.
  const [adds, setAdds] = useState(0);
  const [lastAdded, setLastAdded] = useState(0);
  const groupName = useId();
  const hintId = useId();

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 1800);
    return () => window.clearTimeout(timer);
  }, [added, adds]);

  const needsChoice = options !== undefined && choice === null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (needsChoice) return;

    add(slug, quantity, choice ?? undefined);
    setLastAdded(quantity);
    setAdded(true);
    setAdds((count) => count + 1);
    setQuantity(1);
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {options ? (
        <fieldset className="mb-6">
          <legend className="mb-3 text-[0.875rem] font-medium text-ink">{options.name}</legend>
          <div className="flex flex-wrap gap-2">
            {options.values.map((value) => {
              const selected = choice === value;
              return (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name={groupName}
                    value={value}
                    checked={selected}
                    onChange={() => setChoice(value)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "inline-flex h-11 min-w-12 items-center justify-center rounded-full border px-4 text-[0.9375rem] font-medium transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-accent",
                      selected
                        ? "border-accent bg-accent text-on-accent"
                        : "border-border bg-surface text-ink-muted hover:border-ink-faint hover:text-ink",
                    )}
                  >
                    {value}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="flex gap-3">
        <QuantityStepper value={quantity} onChange={setQuantity} />

        <SubmitButton
          type="submit"
          size="lg"
          disabled={needsChoice}
          aria-describedby={needsChoice ? hintId : undefined}
          className="flex-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-accent disabled:active:translate-y-0 sm:flex-none"
        >
          {/* Both labels share one grid cell, so the button keeps its width. */}
          <span className="grid">
            <span
              aria-hidden={added}
              className={cn(
                "col-start-1 row-start-1 transition-opacity duration-200",
                added && "opacity-0",
              )}
            >
              Add to basket
            </span>
            <span
              aria-hidden={!added}
              className={cn(
                "col-start-1 row-start-1 inline-flex items-center justify-center gap-2 transition-opacity duration-200",
                !added && "opacity-0",
              )}
            >
              <Check size={17} weight="bold" />
              Added
            </span>
          </span>
        </SubmitButton>
      </div>

      {needsChoice && options ? (
        <p id={hintId} className="mt-3 text-[0.875rem] text-ink-muted">
          Choose a {options.name.toLowerCase()}
        </p>
      ) : null}

      <p role="status" aria-live="polite" className="mt-3 text-[0.9375rem] text-ink-muted">
        {adds > 0 ? (
          <span key={adds}>
            <span className="figure">{lastAdded}</span> added to your basket.{" "}
            <Link
              href="/cart"
              className="font-medium text-ink underline underline-offset-4 transition-colors duration-200 hover:text-accent"
            >
              View basket
            </Link>
          </span>
        ) : null}
      </p>
    </form>
  );
}
