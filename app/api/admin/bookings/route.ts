import { NextResponse } from "next/server";
import { guard } from "@/lib/admin/auth.server";
import { listOrders } from "@/lib/booking/store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bookings with their email delivery records, newest first, for staff.
 * Staff only (lib/admin/auth.server.ts).
 */
export async function GET(request: Request) {
  const { staff, response: refused } = await guard(request);
  if (!staff) return refused;
  const orders = await listOrders();
  return NextResponse.json(
    orders
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ checkoutUrl: _url, ...order }) => {
        void _url;
        return order;
      }),
  );
}
