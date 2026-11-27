import "server-only";
import type { AdminStore } from "@/lib/admin/store-backend.server";
import { fileAdminStore } from "@/lib/admin/store-file.server";
import { pgAdminStore } from "@/lib/admin/store-pg.server";

/** The admin store in use: Postgres when BOOKING_DATABASE_URL is set, like bookings. */
export function adminStore(): AdminStore {
  return process.env.BOOKING_DATABASE_URL ? pgAdminStore : fileAdminStore;
}
