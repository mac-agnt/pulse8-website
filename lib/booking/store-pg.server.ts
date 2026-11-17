import "server-only";
import { Pool, type PoolClient } from "pg";
import type { StoreBackend, StoreTx } from "@/lib/booking/store-backend.server";
import type { Order } from "@/lib/booking/store.server";

/**
 * Postgres store, used when BOOKING_DATABASE_URL is set (any hosted Postgres:
 * Neon, Supabase, RDS). The tables are created on first use.
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

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.BOOKING_DATABASE_URL,
      // Serverless: few connections per instance, released quickly.
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
      await client.query(`
        CREATE TABLE IF NOT EXISTS booking_orders (
          id text PRIMARY KEY,
          session_id text NOT NULL,
          status text NOT NULL,
          checkout_session_id text,
          payment_intent_id text,
          created_at timestamptz NOT NULL,
          data jsonb NOT NULL
        );
        CREATE INDEX IF NOT EXISTS booking_orders_session ON booking_orders (session_id);
        CREATE INDEX IF NOT EXISTS booking_orders_status ON booking_orders (status);
        CREATE INDEX IF NOT EXISTS booking_orders_checkout ON booking_orders (checkout_session_id);
        CREATE INDEX IF NOT EXISTS booking_orders_intent ON booking_orders (payment_intent_id);
        CREATE TABLE IF NOT EXISTS booking_events (
          id text PRIMARY KEY,
          claimed_at timestamptz NOT NULL DEFAULT now()
        );
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

type Row = { data: Order };

const orders = (rows: Row[]) => rows.map((row) => row.data);

function txOver(client: PoolClient): StoreTx {
  return {
    async get(orderId) {
      const { rows } = await client.query<Row>("SELECT data FROM booking_orders WHERE id = $1", [orderId]);
      return rows[0]?.data;
    },
    async bySession(sessionId) {
      const { rows } = await client.query<Row>(
        "SELECT data FROM booking_orders WHERE session_id = $1 ORDER BY created_at",
        [sessionId],
      );
      return orders(rows);
    },
    async put(order) {
      await client.query(
        `INSERT INTO booking_orders (id, session_id, status, checkout_session_id, payment_intent_id, created_at, data)
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
        "INSERT INTO booking_events (id) VALUES ($1) ON CONFLICT (id) DO NOTHING",
        [eventId],
      );
      return rowCount === 1;
    },
    async unclaimEvent(eventId) {
      await client.query("DELETE FROM booking_events WHERE id = $1", [eventId]);
    },
  };
}

async function query(sql: string, params: unknown[] = []): Promise<Order[]> {
  await ensureSchema();
  const { rows } = await getPool().query<Row>(sql, params);
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
    get: async (orderId) => (await query("SELECT data FROM booking_orders WHERE id = $1", [orderId]))[0],
    findBy: async (field, value) => {
      const column = field === "checkoutSessionId" ? "checkout_session_id" : "payment_intent_id";
      return (await query(`SELECT data FROM booking_orders WHERE ${column} = $1 LIMIT 1`, [value]))[0];
    },
    all: () => query("SELECT data FROM booking_orders ORDER BY created_at"),
    live: () =>
      query("SELECT data FROM booking_orders WHERE status IN ('pending', 'processing', 'paid')"),
  },
};
