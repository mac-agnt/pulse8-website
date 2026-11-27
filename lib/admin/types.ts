import type { Course, ExtraSession, Fact, HeroCopy, ProcessCopy } from "@/lib/content";
import type { DeliveryRates } from "@/lib/shop-delivery";

/**
 * What the admin keeps, in the shapes both storage backends share.
 *
 * Content is held as a few named documents, each saved on its own with a
 * version number, so Tom editing prices never overwrites someone else's new
 * course date, and two people saving the same document get a clear conflict
 * instead of silently losing one edit.
 */

export type StaffRole = "owner" | "staff";

export type StaffUser = {
  id: string;
  /** lower case */
  email: string;
  name: string;
  role: StaffRole;
  active: boolean;
  /** scrypt hash, or null for someone who signs in by email link only */
  passwordHash: string | null;
  createdAt: string;
  lastLoginAt?: string;
};

/** A staff member as the dashboard sees them: never the hash. */
export type StaffSummary = Omit<StaffUser, "passwordHash"> & { hasPassword: boolean };

export function summarise(user: StaffUser): StaffSummary {
  const { passwordHash, ...rest } = user;
  return { ...rest, hasPassword: Boolean(passwordHash) };
}

export type StaffSession = {
  /** sha256 of the cookie value; the cookie value itself is never stored */
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  actorId: string | null;
  /** "Tom Byrne", kept so the log still reads right after someone leaves */
  actorName: string;
  /** machine-readable, e.g. "prices.update" */
  action: string;
  /** what a person reads: "Cardiac First Response: €95 → €100" */
  summary: string;
};

export type Actor = { id: string | null; name: string };

/** Prices staff set. Never sent to a public page. */
export type PricesDoc = {
  /** classroom course slug to euro per person; null means "Enquire" (no online booking) */
  courses: Record<string, number | null>;
  /** shop product slug to euro */
  shop: Record<string, number>;
  delivery: DeliveryRates;
  /** e.g. "All prices include VAT." Shown in the basket and on product pages. */
  vatNote: string;
};

export type CopyDoc = { hero: HeroCopy; facts: Fact[]; process: ProcessCopy };

export type Docs = {
  copy: CopyDoc;
  /** course descriptions; prices live in `prices` */
  courses: Course[];
  /** classroom dates staff publish */
  dates: ExtraSession[];
  prices: PricesDoc;
};

export type DocKey = keyof Docs;
export const DOC_KEYS: DocKey[] = ["copy", "courses", "dates", "prices"];

export type StoredDoc<K extends DocKey = DocKey> = {
  data: Docs[K];
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type StoredDocs = { [K in DocKey]: StoredDoc<K> };

/** Thrown when a save names a version that is no longer current. */
export class VersionConflict extends Error {
  constructor() {
    super("Someone else saved changes here since you opened it. Reload the page to see them, then make your change again.");
  }
}
