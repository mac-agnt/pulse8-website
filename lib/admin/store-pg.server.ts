import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "@/lib/booking/store-pg.server";
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
 * Admin storage in Postgres, beside the booking tables and under the same
 * rules (see lib/booking/store-pg.server.ts): schema `website`, never exposed
 * by Supabase; every table name written out in full; row level security on
 * with no policies; nothing granted to `anon`, `authenticated` or
 * `service_role`; plain statements only, because of the transaction pooler.
 *
 *   admin_docs           content, course dates and prices: one row per document
 *   staff_users          staff logins (scrypt password hashes, never passwords)
 *   staff_sessions       signed-in browsers, by sha256 of the cookie
 *   staff_login_tokens   one-time email sign-in links, by sha256 of the token
 *   staff_login_attempts recent attempts, for rate limiting; keys are hashed
 *   admin_audit          who changed what, and when
 *
 * Created on first use. The first time, admin_docs is filled from what the
 * site runs on today (seed.server.ts) and the log records the import.
 */

const SCHEMA = "website";
const DOCS = `${SCHEMA}.admin_docs`;
const USERS = `${SCHEMA}.staff_users`;
const SESSIONS = `${SCHEMA}.staff_sessions`;
const TOKENS = `${SCHEMA}.staff_login_tokens`;
const ATTEMPTS = `${SCHEMA}.staff_login_attempts`;
const AUDIT = `${SCHEMA}.admin_audit`;

export const ADMIN_TABLES = [DOCS, USERS, SESSIONS, TOKENS, ATTEMPTS, AUDIT];

/** Arbitrary, fixed, distinct from the booking store's. */
const ADMIN_SCHEMA_LOCK = 80_418_003;
const ADMIN_WRITE_LOCK = 80_418_004;

let ready: Promise<void> | null = null;

async function inTransaction<T>(work: (client: PoolClient) => Promise<T>, lock?: number): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    if (lock !== undefined) await client.query("SELECT pg_advisory_xact_lock($1)", [lock]);
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function ensureSchema(): Promise<void> {
  ready ??= (async () => {
    const seed = await seedDocs();
    await inTransaction(async (client) => {
      const exists = await client.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [SCHEMA]);
      if (exists.rowCount === 0) await client.query(`CREATE SCHEMA ${SCHEMA}`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${DOCS} (
          key text PRIMARY KEY,
          data jsonb NOT NULL,
          version integer NOT NULL DEFAULT 1,
          updated_at timestamptz,
          updated_by text
        );
        CREATE TABLE IF NOT EXISTS ${USERS} (
          id text PRIMARY KEY,
          email text NOT NULL UNIQUE,
          name text NOT NULL,
          role text NOT NULL CHECK (role IN ('owner', 'staff')),
          active boolean NOT NULL DEFAULT true,
          password_hash text,
          created_at timestamptz NOT NULL,
          last_login_at timestamptz
        );
        CREATE TABLE IF NOT EXISTS ${SESSIONS} (
          token_hash text PRIMARY KEY,
          user_id text NOT NULL REFERENCES ${USERS}(id) ON DELETE CASCADE,
          created_at timestamptz NOT NULL,
          expires_at timestamptz NOT NULL,
          last_seen_at timestamptz NOT NULL
        );
        CREATE INDEX IF NOT EXISTS staff_sessions_user ON ${SESSIONS} (user_id);
        CREATE TABLE IF NOT EXISTS ${TOKENS} (
          token_hash text PRIMARY KEY,
          user_id text NOT NULL REFERENCES ${USERS}(id) ON DELETE CASCADE,
          expires_at timestamptz NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ${ATTEMPTS} (
          id bigserial PRIMARY KEY,
          key text NOT NULL,
          at timestamptz NOT NULL
        );
        CREATE INDEX IF NOT EXISTS staff_login_attempts_key ON ${ATTEMPTS} (key, at);
        CREATE TABLE IF NOT EXISTS ${AUDIT} (
          id bigserial PRIMARY KEY,
          at timestamptz NOT NULL DEFAULT now(),
          actor_id text,
          actor_name text NOT NULL,
          action text NOT NULL,
          summary text NOT NULL
        );
        CREATE INDEX IF NOT EXISTS admin_audit_at ON ${AUDIT} (at DESC);
        ALTER TABLE ${DOCS} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${USERS} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${SESSIONS} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${TOKENS} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${ATTEMPTS} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${AUDIT} ENABLE ROW LEVEL SECURITY;
      `);
      await client.query(`
        DO $$
        DECLARE r text;
        BEGIN
          FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
              EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA ${SCHEMA} FROM %I', r);
              EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA ${SCHEMA} FROM %I', r);
            END IF;
          END LOOP;
        END $$;
      `);

      // The one-time import: only documents not there yet are written.
      const imported: string[] = [];
      for (const key of DOC_KEYS) {
        const { rowCount } = await client.query(
          `INSERT INTO ${DOCS} (key, data, version, updated_at, updated_by)
           VALUES ($1, $2, 1, now(), 'Import') ON CONFLICT (key) DO NOTHING`,
          [key, JSON.stringify(seed[key])],
        );
        if (rowCount) imported.push(key);
      }
      if (imported.length) {
        await client.query(
          `INSERT INTO ${AUDIT} (actor_id, actor_name, action, summary) VALUES (NULL, 'Import', 'import', $1)`,
          [`Imported the site's starting ${imported.join(", ")} into the database`],
        );
      }
    }, ADMIN_SCHEMA_LOCK);
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: StaffUser["role"];
  active: boolean;
  password_hash: string | null;
  created_at: Date;
  last_login_at: Date | null;
};

const iso = (value: Date | string | null | undefined) =>
  value === null || value === undefined ? undefined : new Date(value).toISOString();

function toUser(row: UserRow): StaffUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: row.active,
    passwordHash: row.password_hash,
    createdAt: iso(row.created_at) ?? new Date(0).toISOString(),
    ...(row.last_login_at ? { lastLoginAt: iso(row.last_login_at) } : {}),
  };
}

async function run<T extends object = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  await ensureSchema();
  return getPool().query<T>(sql, params);
}

async function upsertUser(client: Pick<PoolClient, "query">, user: StaffUser) {
  await client.query(
    `INSERT INTO ${USERS} (id, email, name, role, active, password_hash, created_at, last_login_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role, active = EXCLUDED.active,
       password_hash = EXCLUDED.password_hash, last_login_at = EXCLUDED.last_login_at`,
    [
      user.id,
      user.email,
      user.name,
      user.role,
      user.active,
      user.passwordHash,
      user.createdAt,
      user.lastLoginAt ?? null,
    ],
  );
}

export const pgAdminStore: AdminStore = {
  async readDocs() {
    const { rows } = await run<{ key: DocKey; data: unknown; version: number; updated_at: Date | null; updated_by: string | null }>(
      `SELECT key, data, version, updated_at, updated_by FROM ${DOCS}`,
    );
    const seed = await seedDocs();
    const out = Object.fromEntries(
      DOC_KEYS.map((key) => [key, { data: seed[key], version: 0, updatedAt: null, updatedBy: null }]),
    ) as unknown as StoredDocs;
    for (const row of rows) {
      if (!DOC_KEYS.includes(row.key)) continue;
      (out as Record<DocKey, StoredDoc>)[row.key] = {
        data: row.data as StoredDoc["data"],
        version: row.version,
        updatedAt: iso(row.updated_at) ?? null,
        updatedBy: row.updated_by,
      };
    }
    return out;
  },

  async updateDoc(key, change, { actor, action, expectedVersion }) {
    await ensureSchema();
    return inTransaction(async (client) => {
      const { rows } = await client.query<{ data: never; version: number }>(
        `SELECT data, version FROM ${DOCS} WHERE key = $1 FOR UPDATE`,
        [key],
      );
      const current = rows[0] ?? { data: (await seedDocs())[key] as never, version: 0 };
      if (expectedVersion !== undefined && expectedVersion !== current.version) throw new VersionConflict();
      const next = change(current.data);
      if (next.audit.length === 0) {
        return { data: current.data, version: current.version, updatedAt: null, updatedBy: null };
      }
      const version = current.version + 1;
      const { rows: saved } = await client.query<{ updated_at: Date }>(
        `INSERT INTO ${DOCS} (key, data, version, updated_at, updated_by) VALUES ($1, $2, $3, now(), $4)
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version,
           updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by
         RETURNING updated_at`,
        [key, JSON.stringify(next.data), version, actor.name],
      );
      for (const summary of next.audit) {
        await client.query(
          `INSERT INTO ${AUDIT} (actor_id, actor_name, action, summary) VALUES ($1, $2, $3, $4)`,
          [actor.id, actor.name, action, summary],
        );
      }
      return { data: next.data, version, updatedAt: iso(saved[0]?.updated_at) ?? null, updatedBy: actor.name };
    }, ADMIN_WRITE_LOCK);
  },

  async countUsers() {
    const { rows } = await run<{ n: string }>(`SELECT count(*) AS n FROM ${USERS}`);
    return Number(rows[0]?.n ?? 0);
  },
  async countActiveOwners() {
    const { rows } = await run<{ n: string }>(`SELECT count(*) AS n FROM ${USERS} WHERE role = 'owner' AND active`);
    return Number(rows[0]?.n ?? 0);
  },
  async userById(id) {
    const { rows } = await run<UserRow>(`SELECT * FROM ${USERS} WHERE id = $1`, [id]);
    return rows[0] ? toUser(rows[0]) : undefined;
  },
  async userByEmail(email) {
    const { rows } = await run<UserRow>(`SELECT * FROM ${USERS} WHERE email = $1`, [email.toLowerCase()]);
    return rows[0] ? toUser(rows[0]) : undefined;
  },
  async listUsers() {
    const { rows } = await run<UserRow>(`SELECT * FROM ${USERS} ORDER BY created_at`);
    return rows.map(toUser);
  },
  async putUser(user) {
    await ensureSchema();
    try {
      await upsertUser(getPool(), user);
      return true;
    } catch (error) {
      if ((error as { code?: string }).code === "23505") return false;
      throw error;
    }
  },
  async bootstrapOwner(user) {
    await ensureSchema();
    return inTransaction(async (client) => {
      const { rows } = await client.query<{ n: string }>(
        `SELECT count(*) AS n FROM ${USERS} WHERE role = 'owner' AND active`,
      );
      if (Number(rows[0]?.n ?? 0) > 0) return false;
      const taken = await client.query(`SELECT 1 FROM ${USERS} WHERE email = $1`, [user.email]);
      if (taken.rowCount) {
        // An inactive or staff account with this email becomes the owner.
        await client.query(
          `UPDATE ${USERS} SET name = $2, role = 'owner', active = true, password_hash = $3 WHERE email = $1`,
          [user.email, user.name, user.passwordHash],
        );
      } else {
        await upsertUser(client, user);
      }
      return true;
    }, ADMIN_WRITE_LOCK);
  },

  async createSession(session: StaffSession) {
    await run(
      `INSERT INTO ${SESSIONS} (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES ($1, $2, $3, $4, $5)`,
      [session.tokenHash, session.userId, session.createdAt, session.expiresAt, session.lastSeenAt],
    );
    // Housekeeping, cheap at this size: expired sessions and links go.
    await getPool().query(`DELETE FROM ${SESSIONS} WHERE expires_at < now()`);
    await getPool().query(`DELETE FROM ${TOKENS} WHERE expires_at < now()`);
  },
  async sessionByHash(tokenHash) {
    const { rows } = await run<{
      token_hash: string;
      user_id: string;
      created_at: Date;
      expires_at: Date;
      last_seen_at: Date;
    }>(`SELECT * FROM ${SESSIONS} WHERE token_hash = $1`, [tokenHash]);
    const row = rows[0];
    if (!row) return undefined;
    return {
      tokenHash: row.token_hash,
      userId: row.user_id,
      createdAt: iso(row.created_at)!,
      expiresAt: iso(row.expires_at)!,
      lastSeenAt: iso(row.last_seen_at)!,
    };
  },
  async touchSession(tokenHash, at) {
    await run(`UPDATE ${SESSIONS} SET last_seen_at = $2 WHERE token_hash = $1`, [tokenHash, at]);
  },
  async deleteSession(tokenHash) {
    await run(`DELETE FROM ${SESSIONS} WHERE token_hash = $1`, [tokenHash]);
  },
  async deleteUserSessions(userId, exceptHash) {
    await run(`DELETE FROM ${SESSIONS} WHERE user_id = $1 AND token_hash <> $2`, [userId, exceptHash ?? ""]);
  },

  async putLoginToken(tokenHash, userId, expiresAt) {
    await run(`INSERT INTO ${TOKENS} (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`, [
      tokenHash,
      userId,
      expiresAt,
    ]);
  },
  async takeLoginToken(tokenHash, now) {
    const { rows } = await run<{ user_id: string; expires_at: Date }>(
      `DELETE FROM ${TOKENS} WHERE token_hash = $1 RETURNING user_id, expires_at`,
      [tokenHash],
    );
    const row = rows[0];
    if (!row || new Date(row.expires_at).getTime() <= Date.parse(now)) return undefined;
    return row.user_id;
  },

  async addAttempt(key, at) {
    await run(`INSERT INTO ${ATTEMPTS} (key, at) VALUES ($1, $2)`, [key, at]);
    await getPool().query(`DELETE FROM ${ATTEMPTS} WHERE at < now() - interval '1 day'`);
  },
  async countAttempts(key, since) {
    const { rows } = await run<{ n: string }>(`SELECT count(*) AS n FROM ${ATTEMPTS} WHERE key = $1 AND at >= $2`, [
      key,
      since,
    ]);
    return Number(rows[0]?.n ?? 0);
  },
  async clearAttempts(key) {
    await run(`DELETE FROM ${ATTEMPTS} WHERE key = $1`, [key]);
  },

  async audit(actor, action, summaries) {
    await ensureSchema();
    for (const summary of summaries) {
      await getPool().query(`INSERT INTO ${AUDIT} (actor_id, actor_name, action, summary) VALUES ($1, $2, $3, $4)`, [
        actor.id,
        actor.name,
        action,
        summary,
      ]);
    }
  },
  async listAudit(limit) {
    const { rows } = await run<{ id: string; at: Date; actor_id: string | null; actor_name: string; action: string; summary: string }>(
      `SELECT * FROM ${AUDIT} ORDER BY at DESC, id DESC LIMIT $1`,
      [limit],
    );
    return rows.map(
      (row): AuditEntry => ({
        id: String(row.id),
        at: iso(row.at)!,
        actorId: row.actor_id,
        actorName: row.actor_name,
        action: row.action,
        summary: row.summary,
      }),
    );
  },
};

export const newId = () => randomUUID();
