import "server-only";

/** Checks for what staff send from the dashboard. Each returns null for a value it won't accept. */

const INVALID = Symbol("invalid");
export type Invalid = typeof INVALID;
export const invalid: Invalid = INVALID;

/**
 * A euro amount: a number or numeric string, more than 0 and at most 100,000,
 * kept to the cent. Blank ("" or null) means "no price", returned as null.
 */
export function euro(value: unknown): number | null | Invalid {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[€,\s]/g, "")) : NaN;
  if (!Number.isFinite(number) || number <= 0 || number > 100_000) return INVALID;
  return Math.round(number * 100) / 100;
}

export function isoDay(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

export function clock(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return h < 24 && m < 60 ? value : null;
}

export function wholeNumber(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof number === "number" && Number.isInteger(number) && number >= min && number <= max ? number : null;
}

export const money = (value: number) => `€${value.toFixed(2).replace(/\.00$/, "")}`;
export const moneyOrEnquire = (value: number | null | undefined) =>
  typeof value === "number" ? money(value) : "Enquire";
