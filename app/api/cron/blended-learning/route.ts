import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { retryDueBlendedEvents } from "@/lib/blended/notify.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retries every undelivered Blended Learning booking event. Run by Vercel Cron
 * (vercel.json), which sends `Authorization: Bearer <CRON_SECRET>`. Without
 * CRON_SECRET set, nothing can call it.
 */
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorised(request)) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await retryDueBlendedEvents());
}
