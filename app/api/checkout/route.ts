import { NextResponse } from "next/server";
import {
  CHECKOUT_EXPIRY_MINUTES,
  HOLD_MINUTES,
  MAX_PLACES_PER_BOOKING,
  paymentConfig,
  returnOrigin,
} from "@/lib/booking/config.server";
import { stripeClient } from "@/lib/booking/stripe.server";
import { attachCheckout, createHold, releaseHold } from "@/lib/booking/store.server";
import { getBookableSession } from "@/lib/sessions.server";
import { formatDayLong } from "@/lib/schedule";
import { clientKey, emailAddress, phoneNumber, rateLimited, singleLine } from "@/lib/validate.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNAVAILABLE =
  "Sorry, there aren't enough places left on this date. Choose another date or enquire about this course.";
const NOT_OPEN =
  "Online booking isn't open for this date. Please enquire about this course or email info@pulse8.ie.";
const FAILED = "We couldn't start your booking. Please try again or email info@pulse8.ie.";

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * Starts a paid booking.
 *
 * Everything that sets the amount is resolved here from server-side records:
 * the published session, its course and that course's rate. The browser sends
 * only which session, how many places and who is booking. A seat hold is taken
 * atomically before Stripe is called and expires with the Checkout Session; a
 * repeat of the same attempt returns the same Checkout rather than a second one.
 */
export async function POST(request: Request) {
  const config = paymentConfig();
  const stripe = stripeClient();
  if (!config || !stripe) return fail(503, NOT_OPEN);

  if (rateLimited(`checkout:${clientKey(request)}`, 10, 10 * 60_000)) {
    return fail(429, "Too many attempts. Please wait a few minutes and try again.");
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(400, FAILED);
  }

  const sessionId = singleLine(body.sessionId, 200);
  const attemptKey = singleLine(body.attemptKey, 100);
  const name = singleLine(body.name, 120);
  const email = emailAddress(body.email);
  const phone = phoneNumber(body.phone);
  const quantity = typeof body.quantity === "number" ? body.quantity : Number.NaN;

  if (!sessionId || !attemptKey || !/^[A-Za-z0-9-]{8,100}$/.test(attemptKey)) return fail(400, FAILED);
  if (!name || !email || !phone) {
    return fail(400, "Check your name, email and phone number, then try again.");
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PLACES_PER_BOOKING) {
    return fail(400, `You can book between 1 and ${MAX_PLACES_PER_BOOKING} places online.`);
  }

  const bookable = await getBookableSession(sessionId);
  if (!bookable) return fail(409, NOT_OPEN);
  const { session, course, unitAmountCents } = bookable;

  let hold;
  try {
    hold = await createHold({
      attemptKey,
      sessionId: session.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      sessionDate: session.date,
      sessionStart: session.start,
      sessionEnd: session.end,
      sessionDays: session.days,
      venue: session.venue,
      delivery: session.delivery,
      quantity,
      unitAmount: unitAmountCents,
      currency: config.currency,
      buyer: { name, email, phone },
      livemode: config.livemode,
      capacity: session.seatsLeft,
      holdMinutes: HOLD_MINUTES,
    });
  } catch (error) {
    console.error("[checkout] could not record the hold:", (error as Error).message);
    return fail(503, FAILED);
  }

  if (!hold.ok) return fail(409, UNAVAILABLE);
  const { order } = hold;
  if (hold.reused && order.checkoutUrl) return NextResponse.json({ url: order.checkoutUrl });

  const origin = returnOrigin(request.headers.get("origin"));
  if (!origin) {
    await releaseHold(order.id);
    return fail(503, FAILED);
  }
  const back = new URLSearchParams({ course: course.slug, session: session.id, cancelled: "1" });

  try {
    const metadata = { booking_id: order.id, session_id: session.id, course_slug: course.slug };
    const checkout = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: email,
        client_reference_id: order.id,
        metadata,
        payment_intent_data: {
          metadata,
          description: `${course.title}, ${formatDayLong(session.date)} ${session.start} (${order.id})`,
        },
        line_items: [
          {
            quantity,
            price_data: {
              currency: config.currency,
              unit_amount: unitAmountCents,
              product_data: {
                name: course.title,
                description: `${formatDayLong(session.date)}, ${session.start} to ${session.end}. ${session.venue}.`,
              },
            },
          },
        ],
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRY_MINUTES * 60 + 30,
        success_url: `${origin}/book/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/book?${back.toString()}`,
      },
      { idempotencyKey: `checkout-${order.id}` },
    );

    if (!checkout.url) throw new Error("Stripe returned no Checkout URL.");
    await attachCheckout(order.id, { id: checkout.id, url: checkout.url, expiresAt: checkout.expires_at });
    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("[checkout] Stripe error:", (error as Error).message);
    await releaseHold(order.id).catch(() => undefined);
    return fail(502, FAILED);
  }
}
