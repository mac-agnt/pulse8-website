import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StoreBackend, StoreTx } from "@/lib/booking/store-backend.server";
import type { Order } from "@/lib/booking/store.server";

/**
 * DEVELOPMENT AND TEST STORE. A JSON file guarded by an in-process lock: every
 * read-modify-write runs one at a time, so holds are atomic within one server
 * process and the file is replaced by rename, never half-written. That is the
 * right shape for `next dev`, a single Node host and the automated checks.
 *
 * Not for Vercel: the file system there is read-only and several instances can
 * run at once. Set BOOKING_DATABASE_URL to use Postgres instead.
 */

type StoreData = {
  orders: Order[];
  /** event ids already handled, newest last */
  events: string[];
};

const MAX_EVENTS = 5000;

function storeFile(): string {
  const dir = process.env.BOOKING_DATA_DIR ?? path.join(process.cwd(), ".data");
  return path.join(dir, "bookings.json");
}

async function load(): Promise<StoreData> {
  try {
    const parsed = JSON.parse(await readFile(storeFile(), "utf8")) as Partial<StoreData>;
    return {
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { orders: [], events: [] };
    throw error;
  }
}

async function save(data: StoreData): Promise<void> {
  const file = storeFile();
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(temp, file);
}

let queue: Promise<unknown> = Promise.resolve();

function txOver(data: StoreData): StoreTx {
  return {
    get: async (orderId) => data.orders.find((order) => order.id === orderId),
    bySession: async (sessionId) => data.orders.filter((order) => order.sessionId === sessionId),
    put: async (order) => {
      const index = data.orders.findIndex((item) => item.id === order.id);
      if (index === -1) data.orders.push(order);
      else data.orders[index] = order;
    },
    claimEvent: async (eventId) => {
      if (data.events.includes(eventId)) return false;
      data.events.push(eventId);
      if (data.events.length > MAX_EVENTS) data.events.splice(0, data.events.length - MAX_EVENTS);
      return true;
    },
    unclaimEvent: async (eventId) => {
      data.events = data.events.filter((id) => id !== eventId);
    },
  };
}

async function read<T>(work: (data: StoreData) => T): Promise<T> {
  await queue.catch(() => undefined);
  return work(await load());
}

export const fileBackend: StoreBackend = {
  /** Runs one read-modify-write at a time. */
  transaction<T>(work: (tx: StoreTx) => Promise<T>): Promise<T> {
    const run = queue.then(async () => {
      const data = await load();
      const result = await work(txOver(data));
      await save(data);
      return result;
    });
    // Keep the chain alive after a failure.
    queue = run.catch(() => undefined);
    return run;
  },
  reads: {
    get: (orderId) => read((data) => data.orders.find((order) => order.id === orderId)),
    findBy: (field, value) => read((data) => data.orders.find((order) => order[field] === value)),
    all: () => read((data) => [...data.orders]),
    live: () =>
      read((data) =>
        data.orders.filter((order) => ["pending", "processing", "paid"].includes(order.status)),
      ),
  },
};
