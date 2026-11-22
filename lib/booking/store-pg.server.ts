import "server-only";
import { Pool, type PoolClient } from "pg";
import type { StoreBackend, StoreTx } from "@/lib/booking/store-backend.server";
import type { Order } from "@/lib/booking/store.server";
import type { ShopOrder } from "@/lib/booking/shop-store.server";
import { poolConfig } from "@/lib/booking/pg-config";

/**
 * Postgres store, used when BOOKING_DATABASE_URL is set. In production that
 * is the Pulse 8 Blended Learning Supabase project, through its Supavisor
 * transaction pooler (port 6543), as the limited `website_app` role that
 * docs/sql/website-db-role.sql creates. Any Postgres works.
 *
 * Privacy. The tables hold customers' names, emails and addresses, and
 * Supabase serves its `public` schema over a REST API. So they live in their
 * own schema, `website`, which is not one of Supabase's exposed schemas, and
 * every table name below is written out in full (no search_path). As a second
 * guard, each table has row level security on with no policies, and `anon`,
 * `authenticated` and `service_role` hold nothing on them: if `website` were
 * ever exposed, the API would still return nothing. The tables are created on
 * first use; the owner (`website_app`) bypasses its own RLS, nobody else does.
 *
 * Pooler. Transaction mode keeps no session state between transactions and
 * no named prepared statements, so: no SET, no session advisory locks (only
 * pg_advisory_xact_lock inside a transaction), and every query is a plain
 * string, which node-pg sends as an unnamed statement. Pool kept small.
 *
 * Every write transaction takes one transaction-scoped advisory lock first, so
 * writes run one at a time across every instance, exactly like the file
 * store's in-process lock. Booking volume is a few writes a minute at most, so
 * one lock costs nothing and leaves no room for a race on the last seat. Event
 * ids are a primary key as well, so a duplicate can never be claimed twice.
 *
 * Each order is one row: the columns that are looked up, plus the whole order
 * as JSON, so a new order field needs no migration.
 */

/** Arbitrary, fixed: the advisory lock every booking write takes. */
const WRITE_LOCK = 80_418_001;
const SCHEMA_LOCK = 80_418_002;

let pool: Pool | null = null;
let schema: Promise<void> | null = null;

/** The schema the website's tables live in. Never one Supabase exposes. */
const SCHEMA = "website";
const ORDERS = `${SCHEMA}.booking_orders`;
const SHOP = `${SCHEMA}.shop_orders`;
const EVENTS = `${SCHEMA}.booking_events`;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      ...poolConfig(process.env.BOOKING_DATABASE_URL ?? "", process.env.BOOKING_DATABASE_CA),
      // Serverless behind a pooler: a few connections per instance, released quickly.
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    // An idle client erroring (database restart) must not crash the process.
    pool.on("error", (error) => console.error("[booking-store] idle client error:", error.message));
  }
  return pool;
}

async function ensureSchema(): Promise<void> {
  schema ??= (async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [SCHEMA_LOCK]);
      // CREATE SCHEMA IF NOT EXISTS still needs CREATE on the database, which
      // website_app does not have (the role script makes the schema), so ask first.
      const exists = await client.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [SCHEMA]);
      if (exists.rowCount === 0) await client.query(`CREATE SCHEMA ${SCHEMA}`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${ORDERS} (
          id text PRIMARY KEY,
          session_id text NOT NULL,
          status text NOT NULL,
          checkout_session_id text,
          payment_intent_id text,
          created_at timestamptz NOT NULL,
          data jsonb NOT NULL
        );
        CREATE INDEX IF NOT EXISTS booking_orders_session ON ${ORDERS} (session_id);
        CREATE INDEX IF NOT EXISTS booking_orders_status ON ${ORDERS} (status);
        CREATE INDEX IF NOT EXISTS booking_orders_checkout ON ${ORDERS} (checkout_session_id);
        CREATE INDEX IF NOT EXISTS booking_orders_intent ON ${ORDERS} (payment_intent_id);
        CREATE TABLE IF NOT EXISTS ${SHOP} (
          id text PRIMARY KEY,
          attempt_key text NOT NULL,
          status text NOT NULL,
          checkout_session_id text,
          payment_intent_id text,
          created_at timestamptz NOT NULL,
          data jsonb NOT NULL
        );
        CREATE INDEX IF NOT EXISTS shop_orders_attempt ON ${SHOP} (attempt_key);
        CREATE INDEX IF NOT EXISTS shop_orders_checkout ON ${SHOP} (checkout_session_id);
        CREATE INDEX IF NOT EXISTS shop_orders_intent ON ${SHOP} (payment_intent_id);
        CREATE TABLE IF NOT EXISTS ${EVENTS} (
          id text PRIMARY KEY,
          claimed_at timestamptz NOT NULL DEFAULT now()
        );
        ALTER TABLE ${ORDERS} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${SHOP} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${EVENTS} ENABLE ROW LEVEL SECURITY;
      `);
      // Supabase's API roles get nothing here, even if a default grant ever
      // gives them something. Skipped where the roles don't exist (plain
      // Postgres). The schema itself is only revoked by its owner.
      await client.query(`
        DO $$
        DECLARE r text;
        BEGIN
          FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
              EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA ${SCHEMA} FROM %I', r);
              EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA ${SCHEMA} FROM %I', r);
              IF (SELECT nspowner FROM pg_namespace WHERE nspname = '${SCHEMA}') =
                 (SELECT oid FROM pg_roles WHERE rolname = current_user) THEN
                EXECUTE format('REVOKE ALL ON SCHEMA ${SCHEMA} FROM %I', r);
              END IF;
            END IF;
          END LOOP;
        END $$;
      `);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      schema = null;
      throw error;
    } finally {
      client.release();
    }
  })();
  return schema;
}

type Row<T = Order> = { data: T };

const orders = <T = Order>(rows: Row<T>[]) => rows.map((row) => row.data);

function txOver(client: PoolClient): StoreTx {
  return {
    async get(orderId) {
      const { rows } = await client.query<Row>(`SELECT data FROM ${ORDERS} WHERE id = $1`, [orderId]);
      return rows[0]?.data;
    },
    async bySession(sessionId) {
      const { rows } = await client.query<Row>(
        `SELECT data FROM ${ORDERS} WHERE session_id = $1 ORDER BY created_at`,
        [sessionId],
      );
      return orders(rows);
    },
    async put(order) {
      await client.query(
        `INSERT INTO ${ORDERS} (id, session_id, status, checkout_session_id, payment_intent_id, created_at, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           session_id = EXCLUDED.session_id,
           status = EXCLUDED.status,
           checkout_session_id = EXCLUDED.checkout_session_id,
           payment_intent_id = EXCLUDED.payment_intent_id,
           data = EXCLUDED.data`,
        [
          order.id,
          order.sessionId,
          order.status,
          order.checkoutSessionId ?? null,
          order.paymentIntentId ?? null,
          order.createdAt,
          JSON.stringify(order),
        ],
      );
    },
    async claimEvent(eventId) {
      const { rowCount } = await client.query(
        `INSERT INTO ${EVENTS} (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
        [eventId],
      );
      return rowCount === 1;
    },
    async unclaimEvent(eventId) {
      await client.query(`DELETE FROM ${EVENTS} WHERE id = $1`, [eventId]);
    },
    async getShop(orderId) {
      const { rows } = await client.query<Row<ShopOrder>>(`SELECT data FROM ${SHOP} WHERE id = $1`, [orderId]);
      return rows[0]?.data;
    },
    async shopByAttempt(attemptKey) {
      const { rows } = await client.query<Row<ShopOrder>>(
        `SELECT data FROM ${SHOP} WHERE attempt_key = $1 ORDER BY created_at DESC LIMIT 1`,
        [attemptKey],
      );
      return rows[0]?.data;
    },
    async putShop(order) {
      await client.query(
        `INSERT INTO ${SHOP} (id, attempt_key, status, checkout_session_id, payment_intent_id, created_at, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           checkout_session_id = EXCLUDED.checkout_session_id,
           payment_intent_id = EXCLUDED.payment_intent_id,
           data = EXCLUDED.data`,
        [
          order.id,
          order.attemptKey,
          order.status,
          order.checkoutSessionId ?? null,
          order.paymentIntentId ?? null,
          order.createdAt,
          JSON.stringify(order),
        ],
      );
    },
  };
}

async function query<T = Order>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const { rows } = await getPool().query<Row<T>>(sql, params);
  return orders(rows);
}

export const pgBackend: StoreBackend = {
  async transaction(work) {
    await ensureSchema();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [WRITE_LOCK]);
      const result = await work(txOver(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  },
  reads: {
    get: async (orderId) => (await query(`SELECT data FROM ${ORDERS} WHERE id = $1`, [orderId]))[0],
    findBy: async (field, value) => {
      const column = field === "checkoutSessionId" ? "checkout_session_id" : "payment_intent_id";
      return (await query(`SELECT data FROM ${ORDERS} WHERE ${column} = $1 LIMIT 1`, [value]))[0];
    },
    all: () => query(`SELECT data FROM ${ORDERS} ORDER BY created_at`),
    live: () =>
      query(`SELECT data FROM ${ORDERS} WHERE status IN ('pending', 'processing', 'paid')`),
    getShop: async (orderId) => (await query<ShopOrder>(`SELECT data FROM ${SHOP} WHERE id = $1`, [orderId]))[0],
    findShopBy: async (field, value) => {
      const column = field === "checkoutSessionId" ? "checkout_session_id" : "payment_intent_id";
      return (await query<ShopOrder>(`SELECT data FROM ${SHOP} WHERE ${column} = $1 LIMIT 1`, [value]))[0];
    },
    allShop: () => query<ShopOrder>(`SELECT data FROM ${SHOP} ORDER BY created_at`),
  },
};
