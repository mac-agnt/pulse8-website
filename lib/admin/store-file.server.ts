import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { seedDocs } from "@/lib/admin/seed.server";
import type { AdminStore } from "@/lib/admin/store-backend.server";
import {
  DOC_KEYS,
  VersionConflict,
  type AuditEntry,
  type DocKey,
  type StaffSession,
  type StaffUser,
  type StoredDoc,
  type StoredDocs,
} from "@/lib/admin/types";

/**
 * DEVELOPMENT AND TEST STORE: the admin's documents, staff, sessions and log
 * in one JSON file (.data/admin.json, or under BOOKING_DATA_DIR), changed one
 * write at a time and replaced by rename. Documents not saved yet read as the
 * starting content (seed.server.ts). Not for Vercel; see store-pg.server.ts.
 */

type FileData = {
  docs: Partial<Record<DocKey, StoredDoc>>;
  users: StaffUser[];
  sessions: StaffSession[];
  tokens: Array<{ tokenHash: string; userId: string; expiresAt: string }>;
  attempts: Array<{ key: string; at: string }>;
  audit: AuditEntry[];
};

const empty = (): FileData => ({ docs: {}, users: [], sessions: [], tokens: [], attempts: [], audit: [] });

function file(): string {
  const dir = process.env.BOOKING_DATA_DIR ?? path.join(process.cwd(), ".data");
  return path.join(dir, "admin.json");
}

async function load(): Promise<FileData> {
  try {
    return { ...empty(), ...(JSON.parse(await readFile(file(), "utf8")) as Partial<FileData>) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw error;
  }
}

async function save(data: FileData): Promise<void> {
  const target = file();
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(temp, target);
}

let queue: Promise<unknown> = Promise.resolve();

/** One change at a time, in this process. */
function change<T>(work: (data: FileData) => T | Promise<T>): Promise<T> {
  const next = queue.then(async () => {
    const data = await load();
    // The first write records the import, as the Postgres store does.
    if (data.audit.length === 0) {
      data.audit.push(...auditEntries({ id: null, name: "Import" }, "import", ["Started from the site's built-in content"]));
    }
    const result = await work(data);
    await save(data);
    return result;
  });
  queue = next.catch(() => undefined);
  return next;
}

const read = () => queue.then(load);

let auditCounter = 0;
function auditEntries(actor: { id: string | null; name: string }, action: string, summaries: string[]): AuditEntry[] {
  const at = new Date().toISOString();
  return summaries.map((summary) => ({
    id: `${Date.now()}-${(auditCounter += 1)}`,
    at,
    actorId: actor.id,
    actorName: actor.name,
    action,
    summary,
  }));
}

export const fileAdminStore: AdminStore = {
  async readDocs() {
    const [data, seed] = await Promise.all([read(), seedDocs()]);
    return Object.fromEntries(
      DOC_KEYS.map((key) => [key, data.docs[key] ?? { data: seed[key], version: 0, updatedAt: null, updatedBy: null }]),
    ) as unknown as StoredDocs;
  },

  async updateDoc(key, apply, { actor, action, expectedVersion }) {
    const seed = await seedDocs();
    return change((data) => {
      const current = (data.docs[key] ?? { data: seed[key], version: 0, updatedAt: null, updatedBy: null }) as StoredDoc<typeof key>;
      if (expectedVersion !== undefined && expectedVersion !== current.version) throw new VersionConflict();
      const next = apply(current.data);
      if (next.audit.length === 0) return current;
      const saved: StoredDoc<typeof key> = {
        data: next.data,
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.name,
      };
      data.docs[key] = saved as StoredDoc;
      data.audit.push(...auditEntries(actor, action, next.audit));
      return saved;
    });
  },

  countUsers: async () => (await read()).users.length,
  countActiveOwners: async () => (await read()).users.filter((user) => user.role === "owner" && user.active).length,
  userById: async (id) => (await read()).users.find((user) => user.id === id),
  userByEmail: async (email) => (await read()).users.find((user) => user.email === email.toLowerCase()),
  listUsers: async () => (await read()).users,
  putUser: (user) =>
    change((data) => {
      if (data.users.some((other) => other.email === user.email && other.id !== user.id)) return false;
      const index = data.users.findIndex((other) => other.id === user.id);
      if (index === -1) data.users.push(user);
      else data.users[index] = user;
      return true;
    }),
  bootstrapOwner: (user) =>
    change((data) => {
      if (data.users.some((other) => other.role === "owner" && other.active)) return false;
      const existing = data.users.find((other) => other.email === user.email);
      if (existing) Object.assign(existing, { name: user.name, role: "owner", active: true, passwordHash: user.passwordHash });
      else data.users.push(user);
      return true;
    }),

  createSession: (session) =>
    change((data) => {
      const now = Date.now();
      data.sessions = data.sessions.filter((item) => Date.parse(item.expiresAt) > now);
      data.tokens = data.tokens.filter((item) => Date.parse(item.expiresAt) > now);
      data.sessions.push(session);
    }),
  sessionByHash: async (tokenHash) => (await read()).sessions.find((item) => item.tokenHash === tokenHash),
  touchSession: (tokenHash, at) =>
    change((data) => {
      const session = data.sessions.find((item) => item.tokenHash === tokenHash);
      if (session) session.lastSeenAt = at;
    }),
  deleteSession: (tokenHash) =>
    change((data) => {
      data.sessions = data.sessions.filter((item) => item.tokenHash !== tokenHash);
    }),
  deleteUserSessions: (userId, exceptHash) =>
    change((data) => {
      data.sessions = data.sessions.filter((item) => item.userId !== userId || item.tokenHash === exceptHash);
    }),

  putLoginToken: (tokenHash, userId, expiresAt) =>
    change((data) => {
      data.tokens.push({ tokenHash, userId, expiresAt });
    }),
  takeLoginToken: (tokenHash, now) =>
    change((data) => {
      const token = data.tokens.find((item) => item.tokenHash === tokenHash);
      data.tokens = data.tokens.filter((item) => item.tokenHash !== tokenHash);
      return token && Date.parse(token.expiresAt) > Date.parse(now) ? token.userId : undefined;
    }),

  addAttempt: (key, at) =>
    change((data) => {
      const dayAgo = Date.now() - 86_400_000;
      data.attempts = data.attempts.filter((item) => Date.parse(item.at) > dayAgo);
      data.attempts.push({ key, at });
    }),
  countAttempts: async (key, since) =>
    (await read()).attempts.filter((item) => item.key === key && Date.parse(item.at) >= Date.parse(since)).length,
  clearAttempts: (key) =>
    change((data) => {
      data.attempts = data.attempts.filter((item) => item.key !== key);
    }),

  audit: (actor, action, summaries) =>
    change((data) => {
      data.audit.push(...auditEntries(actor, action, summaries));
    }),
  listAudit: async (limit) => [...(await read()).audit].reverse().slice(0, limit),
};
