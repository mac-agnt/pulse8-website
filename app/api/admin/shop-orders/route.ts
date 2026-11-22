import { NextResponse } from "next/server";
import { listShopOrders } from "@/lib/booking/shop-store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Shop orders with their email delivery records, newest first, for staff.
 * Behind the same basic auth as the dashboard (proxy.ts).
 */
export async function GET() {
  const orders = await listShopOrders();
  return NextResponse.json(
    orders
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ checkoutUrl: _url, ...order }) => {
        void _url;
        return order;
      }),
  );
}
