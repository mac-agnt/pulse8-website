import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { BLENDED_CACHE_TAG } from "@/lib/blended/feed.server";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verify } from "@/lib/blended/signing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pulse 8 Blended Learning's `course.changed` messages (BL env
 * WEBSITE_WEBHOOK_URL points here). The signature is checked over the raw
 * body with BLENDED_LEARNING_SECRET; anything unsigned, forged or more than
 * five minutes old is refused with 401. A good message drops the cached course
 * list, so the next page view reads BL afresh. Nothing in the body is trusted
 * beyond that: every message just means "refresh".
 */
export async function POST(request: Request) {
  const secret = process.env.BLENDED_LEARNING_SECRET;
  if (!secret) return new NextResponse("Not configured", { status: 503 });

  const payload = await request.text();
  const valid = verify({
    secret,
    payload,
    timestamp: request.headers.get(TIMESTAMP_HEADER),
    signature: request.headers.get(SIGNATURE_HEADER),
  });
  if (!valid) return new NextResponse("Invalid signature", { status: 401 });

  revalidateTag(BLENDED_CACHE_TAG, { expire: 0 });
  return NextResponse.json({ ok: true });
}
