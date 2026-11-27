import { NextResponse } from "next/server";
import { guard } from "@/lib/admin/auth.server";
import { bookingWithoutMoney } from "@/lib/admin/finance";
import { listOrders } from "@/lib/booking/store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bookings with their email delivery records, newest first, for staff.
 * Staff only (lib/admin/auth.server.ts). Amounts are owners-only: staff get
 * the same list without any money in it (the Finance page is the owner's).
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
      })
      .map((order) => (staff.user.role === "owner" ? order : bookingWithoutMoney(order))),
  );
}
