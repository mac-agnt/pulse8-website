import "server-only";
import type {
  Actor,
  AuditEntry,
  DocKey,
  Docs,
  StaffSession,
  StaffUser,
  StoredDoc,
  StoredDocs,
} from "@/lib/admin/types";

/**
 * Where the admin keeps content, staff logins and the activity log. Two
 * backends implement it, chosen like the booking store's:
 *
 *   store-file.server.ts  a JSON file under .data/. Development and the checks.
 *   store-pg.server.ts    Postgres schema `website`, when BOOKING_DATABASE_URL
 *                         is set. Production on Vercel.
 */

export type DocChange<K extends DocKey> = {
  data: Docs[K];
  /** one line per change, for the activity log; empty when nothing changed */
  audit: string[];
};

export type AdminStore = {
  readDocs(): Promise<StoredDocs>;
  /**
   * Reads the current document, applies `change` and saves the result, as one
   * step no other save can interleave with. With `expectedVersion`, throws
   * VersionConflict when the document moved on since the caller read it.
   * Writes one activity entry per audit line.
   */
  updateDoc<K extends DocKey>(
    key: K,
    change: (current: Docs[K]) => DocChange<K>,
    options: { actor: Actor; action: string; expectedVersion?: number },
  ): Promise<StoredDoc<K>>;

  countUsers(): Promise<number>;
  countActiveOwners(): Promise<number>;
  userById(id: string): Promise<StaffUser | undefined>;
  userByEmail(email: string): Promise<StaffUser | undefined>;
  listUsers(): Promise<StaffUser[]>;
  /** insert, or replace by id; false if another user already has the email */
  putUser(user: StaffUser): Promise<boolean>;
  /** creates the first owner only while there is no active owner; false otherwise */
  bootstrapOwner(user: StaffUser): Promise<boolean>;

  createSession(session: StaffSession): Promise<void>;
  sessionByHash(tokenHash: string): Promise<StaffSession | undefined>;
  touchSession(tokenHash: string, at: string): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  /** signs someone out everywhere, except the session given */
  deleteUserSessions(userId: string, exceptHash?: string): Promise<void>;

  putLoginToken(tokenHash: string, userId: string, expiresAt: string): Promise<void>;
  /** the user id, once: a token is spent by taking it, and only before it expires */
  takeLoginToken(tokenHash: string, now: string): Promise<string | undefined>;

  addAttempt(key: string, at: string): Promise<void>;
  countAttempts(key: string, since: string): Promise<number>;
  clearAttempts(key: string): Promise<void>;

  audit(actor: Actor, action: string, summaries: string[]): Promise<void>;
  listAudit(limit: number): Promise<AuditEntry[]>;
};
