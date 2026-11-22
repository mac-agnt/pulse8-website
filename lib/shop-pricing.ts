import { getProduct } from "@/lib/shop";
import { deliveryCents } from "@/lib/shop-delivery";

/**
 * Prices a basket from the catalogue. The browser sends only which products,
 * which option and how many; every amount is worked out here from lib/shop,
 * so a tampered basket can change what is ordered but never what it costs.
 */

export const MAX_SHOP_LINES = 50;
export const MAX_LINE_QUANTITY = 99;

export type PricedLine = {
  slug: string;
  name: string;
  /** the product's choice, e.g. glove size, when it has one */
  option?: string;
  optionName?: string;
  quantity: number;
  /** cents */
  unitAmount: number;
  /** cents */
  lineTotal: number;
};

export type PricedBasket = {
  lines: PricedLine[];
  /** cents */
  subtotal: number;
  /** cents */
  delivery: number;
  /** cents */
  total: number;
};

/** Euro as published (two decimals at most) to whole cents. */
export function toCents(euro: number): number {
  return Math.round(euro * 100);
}

/**
 * Null when the basket is empty, too long, or names anything that is not on
 * sale exactly as asked (unknown product, missing or invalid option, a
 * quantity outside 1 to 99). Repeated lines for the same product and option
 * are merged.
 */
export function priceBasket(input: unknown): PricedBasket | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_SHOP_LINES) return null;

  const merged = new Map<string, PricedLine>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const { slug, option, quantity } = raw as { slug?: unknown; option?: unknown; quantity?: unknown };
    if (typeof slug !== "string" || typeof quantity !== "number" || !Number.isInteger(quantity)) return null;
    if (quantity < 1 || quantity > MAX_LINE_QUANTITY) return null;

    const product = getProduct(slug);
    if (!product) return null;
    if (product.options) {
      if (typeof option !== "string" || !product.options.values.includes(option)) return null;
    } else if (option !== undefined && option !== null && option !== "") {
      return null;
    }

    const choice = product.options ? (option as string) : undefined;
    const key = choice ? `${slug}:${choice}` : slug;
    const unitAmount = toCents(product.price);
    const existing = merged.get(key);
    const total = (existing?.quantity ?? 0) + quantity;
    if (total > MAX_LINE_QUANTITY) return null;
    merged.set(key, {
      slug,
      name: product.name,
      ...(choice ? { option: choice, optionName: product.options?.name } : {}),
      quantity: total,
      unitAmount,
      lineTotal: unitAmount * total,
    });
  }

  const lines = [...merged.values()];
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const delivery = deliveryCents(subtotal);
  return { lines, subtotal, delivery, total: subtotal + delivery };
}

/** "Nitrile gloves (Size: M)" */
export function lineLabel(line: Pick<PricedLine, "name" | "option" | "optionName">): string {
  return line.option ? `${line.name} (${line.optionName ?? "Option"}: ${line.option})` : line.name;
}
