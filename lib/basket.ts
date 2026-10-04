import { useMemo, useSyncExternalStore } from "react";
import { getProduct, type Product } from "@/lib/shop";

/**
 * The basket.
 *
 * A module-level store read through useSyncExternalStore and persisted to
 * localStorage, so every component that shows the basket reads one source and
 * other tabs follow along through the `storage` event.
 *
 * Only slug, option and quantity are stored. Name, price and image are looked
 * up in lib/shop at render, so a catalogue change reaches every saved basket
 * and a product that has been withdrawn simply drops out.
 *
 * The server snapshot is a fixed empty basket. The server render and the first
 * client render therefore always agree, and the saved basket arrives on the
 * render straight after hydration. Client components only: this imports hooks.
 */

const STORAGE_KEY = "pulse8-basket";
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

type StoredLine = { slug: string; option?: string; quantity: number };

export type BasketLine = {
  /** slug, or slug:option when the product has a choice, e.g. gloves:M */
  key: string;
  slug: string;
  option?: string;
  quantity: number;
  product: Product;
  /** euro, rounded to the cent */
  lineTotal: number;
};

const EMPTY: readonly StoredLine[] = [];

export function lineKey(slug: string, option?: string): string {
  return option ? `${slug}:${option}` : slug;
}

export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return MIN_QUANTITY;
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.round(quantity)));
}

function toCents(euro: number): number {
  return Math.round(euro * 100) / 100;
}

function storedLine(slug: string, quantity: number, option?: string): StoredLine {
  return option ? { slug, option, quantity } : { slug, quantity };
}

/** Anything in storage is untrusted: keep well-formed lines, merge duplicates. */
function parse(raw: string | null): readonly StoredLine[] {
  if (!raw) return EMPTY;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (!Array.isArray(data)) return EMPTY;

  const merged = new Map<string, StoredLine>();
  for (const item of data) {
    if (typeof item !== "object" || item === null) continue;
    const { slug, option, quantity } = item as Record<string, unknown>;
    if (typeof slug !== "string" || typeof quantity !== "number") continue;

    const choice = typeof option === "string" && option ? option : undefined;
    const key = lineKey(slug, choice);
    const previous = merged.get(key)?.quantity ?? 0;
    merged.set(key, storedLine(slug, clampQuantity(previous + quantity), choice));
  }

  return merged.size > 0 ? [...merged.values()] : EMPTY;
}

/* Store ------------------------------------------------------------------ */

// null means "not read yet": the first getSnapshot on the client fills it.
let snapshot: readonly StoredLine[] | null = null;
const listeners = new Set<() => void>();

function readStorage(): readonly StoredLine[] {
  try {
    return parse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function getSnapshot(): readonly StoredLine[] {
  if (snapshot === null) snapshot = readStorage();
  return snapshot;
}

function getServerSnapshot(): readonly StoredLine[] {
  return EMPTY;
}

function onStorage(event: StorageEvent) {
  // A null key means another tab cleared storage outright.
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  snapshot = readStorage();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorage);
      // Nobody is listening for other tabs now, so re-read on the next mount.
      snapshot = null;
    }
  };
}

function write(next: readonly StoredLine[]) {
  snapshot = next.length > 0 ? next : EMPTY;
  try {
    if (snapshot.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private mode or a full quota: the basket still works for this visit.
  }
  emit();
}

/* Actions ---------------------------------------------------------------- */

function add(slug: string, quantity = 1, option?: string) {
  if (!getProduct(slug)) return;

  const key = lineKey(slug, option);
  const current = getSnapshot();
  const existing = current.find((line) => lineKey(line.slug, line.option) === key);

  write(
    existing
      ? current.map((line) =>
          line === existing
            ? { ...line, quantity: clampQuantity(line.quantity + quantity) }
            : line,
        )
      : [...current, storedLine(slug, clampQuantity(quantity), option)],
  );
}

function setQuantity(key: string, quantity: number) {
  write(
    getSnapshot().map((line) =>
      lineKey(line.slug, line.option) === key
        ? { ...line, quantity: clampQuantity(quantity) }
        : line,
    ),
  );
}

function remove(key: string) {
  write(getSnapshot().filter((line) => lineKey(line.slug, line.option) !== key));
}

function clear() {
  write(EMPTY);
}

/* Reading ---------------------------------------------------------------- */

/**
 * Stored lines to display lines. A line drops out when its product is gone, or
 * when its option no longer matches what the product offers.
 */
function resolve(stored: readonly StoredLine[]): BasketLine[] {
  const lines: BasketLine[] = [];

  for (const line of stored) {
    const product = getProduct(line.slug);
    if (!product) continue;

    const optionValid = product.options
      ? line.option !== undefined && product.options.values.includes(line.option)
      : line.option === undefined;
    if (!optionValid) continue;

    lines.push({
      key: lineKey(line.slug, line.option),
      slug: line.slug,
      option: line.option,
      quantity: line.quantity,
      product,
      lineTotal: toCents(product.price * line.quantity),
    });
  }

  return lines;
}

export function useBasket() {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const summary = useMemo(() => {
    const lines = resolve(stored);
    return {
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: toCents(lines.reduce((sum, line) => sum + line.lineTotal, 0)),
    };
  }, [stored]);

  return { ...summary, add, setQuantity, remove, clear };
}

const subscribeNever = () => () => {};

/**
 * False on the server and during hydration, true after. Lets the basket page
 * show a skeleton rather than "empty" before the saved basket has been read.
 */
export function useBasketReady(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
