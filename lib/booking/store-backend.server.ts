import "server-only";
import type { Order } from "@/lib/booking/store.server";
import type { ShopOrder } from "@/lib/booking/shop-store.server";

/**
 * Where bookings are kept. Two backends implement this, and every booking rule
 * (holds, the last seat, the paid transition) lives above it in
 * store.server.ts, so both behave the same:
 *
 *   store-file.server.ts  JSON file and an in-process lock. Development, the
 *                         automated checks, a single Node host.
 *   store-pg.server.ts    Postgres, chosen when BOOKING_DATABASE_URL is set.
 *                         Needed on Vercel: several instances, no writable disk.
 *
 * A transaction runs alone: no other transaction, in this process or any
 * other, sees or changes bookings until it commits. That is what keeps a hold
 * on the last seat race-safe. Reads outside a transaction see committed data.
 */
export type StoreTx = {
  get(orderId: string): Promise<Order | undefined>;
  /** every order for one session, any status */
  bySession(sessionId: string): Promise<Order[]>;
  /** insert or replace */
  put(order: Order): Promise<void>;
  /** false when the event id was already claimed */
  claimEvent(eventId: string): Promise<boolean>;
  unclaimEvent(eventId: string): Promise<void>;
  /** shop orders: kept apart from bookings, so no seat rule ever sees them */
  getShop(orderId: string): Promise<ShopOrder | undefined>;
  shopByAttempt(attemptKey: string): Promise<ShopOrder | undefined>;
  putShop(order: ShopOrder): Promise<void>;
};

export type StoreReads = {
  get(orderId: string): Promise<Order | undefined>;
  findBy(field: "checkoutSessionId" | "paymentIntentId", value: string): Promise<Order | undefined>;
  all(): Promise<Order[]>;
  /** orders that can be holding a seat: pending, processing or paid */
  live(): Promise<Order[]>;
  getShop(orderId: string): Promise<ShopOrder | undefined>;
  findShopBy(field: "checkoutSessionId" | "paymentIntentId", value: string): Promise<ShopOrder | undefined>;
  allShop(): Promise<ShopOrder[]>;
};

export type StoreBackend = {
  transaction<T>(work: (tx: StoreTx) => Promise<T>): Promise<T>;
  reads: StoreReads;
};
