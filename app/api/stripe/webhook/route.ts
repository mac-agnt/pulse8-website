import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { keyIsLive, stripeClient } from "@/lib/booking/stripe.server";
import {
  claimEvent,
  flagException,
  getOrder,
  markPaid,
  markProcessing,
  releaseHold,
  unclaimEvent,
} from "@/lib/booking/store.server";
import { sendDueBookingEmails } from "@/lib/booking/notify.server";
import { releasedSeats } from "@/lib/sessions.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. The only thing that can mark a booking paid.
 *
 * The signature is checked against the raw body; the event's mode must match
 * the key's; and the Checkout Session must match the order it names (session
 * id, amount, currency). Each event id is claimed once, so a replay or a
 * concurrent duplicate is a no-op, and the paid transition itself is
 * idempotent too. Emails are sent after the booking is committed; a failed
 * email is recorded and retried separately, it never undoes the booking.
 */
export async function POST(request: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new NextResponse("Not configured", { status: 503 });

  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  if (!signature) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (event.livemode !== keyIsLive()) {
    return new NextResponse("Mode mismatch", { status: 400 });
  }

  if (!(await claimEvent(event.id))) return NextResponse.json({ received: true, duplicate: true });

  try {
    await handle(event);
  } catch (error) {
    // Let Stripe retry the whole event.
    await unclaimEvent(event.id).catch(() => undefined);
    console.error(`[webhook] ${event.type} ${event.id} failed:`, (error as Error).message);
    return new NextResponse("Handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function paymentIntentId(checkout: Stripe.Checkout.Session): string | undefined {
  const value = checkout.payment_intent;
  return typeof value === "string" ? value : value?.id;
}

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      break;
    default:
      return;
  }

  const checkout = event.data.object as Stripe.Checkout.Session;
  const bookingId = checkout.metadata?.booking_id ?? checkout.client_reference_id ?? null;
  if (!bookingId) return; // Not one of ours (for example a shop payment link).

  const order = await getOrder(bookingId);
  if (!order) {
    console.error(`[webhook] ${event.type} names unknown booking ${bookingId}`);
    return;
  }

  // Everything below must agree with what we created, or staff look at it.
  const mismatch =
    (order.checkoutSessionId && order.checkoutSessionId !== checkout.id) ||
    checkout.livemode !== order.livemode ||
    (event.type !== "checkout.session.expired" &&
      (checkout.amount_total !== order.amountTotal || checkout.currency !== order.currency));

  if (mismatch) {
    if (checkout.payment_status === "paid") {
      await flagException(order.id, "Stripe session did not match the booking (amount, currency or session). Reconcile before confirming.");
      await sendDueBookingEmails(order.id);
    }
    console.error(`[webhook] ${event.type} for ${order.id} did not match the booking`);
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      if (checkout.payment_status === "paid") {
        await fulfil(order.id, paymentIntentId(checkout));
      } else {
        // A delayed method (bank debit): keep it pending until Stripe says.
        await markProcessing(order.id, paymentIntentId(checkout));
      }
      return;
    }
    case "checkout.session.async_payment_succeeded":
      await fulfil(order.id, paymentIntentId(checkout));
      return;
    case "checkout.session.async_payment_failed":
      await releaseHold(order.id, "failed");
      return;
    case "checkout.session.expired":
      await releaseHold(order.id, "expired");
      return;
  }
}

async function fulfil(orderId: string, intent: string | undefined) {
  const order = await getOrder(orderId);
  if (!order) return;
  const outcome = await markPaid(orderId, intent, await releasedSeats(order.sessionId));
  if (outcome.kind === "missing") return;
  await sendDueBookingEmails(orderId);
}
