import { NextResponse } from "next/server";
import { guard } from "@/lib/admin/auth.server";
import { summariseFinance, type FinanceMode, type FinanceRange } from "@/lib/admin/finance";
import { listOrders } from "@/lib/booking/store.server";
import { listShopOrders } from "@/lib/booking/shop-store.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANGES: FinanceRange[] = ["30d", "90d", "12m", "all"];

/**
 * Revenue from every source, for the Finance page. Owners only: staff get 403
 * (lib/admin/auth.server.ts), and the page itself is not in their menu.
 *
 * GET /api/admin/finance?range=30d|90d|12m|all&mode=live|test
 */
export async function GET(request: Request) {
  const { staff, response: refused } = await guard(request, "owner");
  if (!staff) return refused;
  const params = new URL(request.url).searchParams;
  const range = (RANGES as string[]).includes(params.get("range") ?? "") ? (params.get("range") as FinanceRange) : "12m";
  const modeParam = params.get("mode");
  const mode: FinanceMode | undefined = modeParam === "live" || modeParam === "test" ? modeParam : undefined;
  try {
    const [orders, shopOrders] = await Promise.all([listOrders(), listShopOrders()]);
    return NextResponse.json(summariseFinance({ orders, shopOrders }, { range, mode }), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[admin-finance] could not read orders:", (error as Error).message);
    return NextResponse.json({ error: "Payments can't be read right now. Try again in a minute." }, { status: 503 });
  }
}
