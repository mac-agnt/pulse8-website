import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { keyIsLive, stripeClient } from "@/lib/booking/stripe.server";
import {
  claimEvent,
  flagException,
  getOrder,
  getOrderByPaymentIntent,
  markPaid,
  markProcessing,
  markRefunded,
  recordPartialRefund,
  releaseHold,
  unclaimEvent,
} from "@/lib/booking/store.server";
import { sendDueBookingEmails, sendRefundReviewEmail } from "@/lib/booking/notify.server";
import { sendDueBlendedEvents } from "@/lib/blended/notify.server";
import { handleShopCheckout, handleShopRefund } from "@/lib/booking/shop-webhook.server";
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
 * email is recorded and retried separately, it never undoes the booking. The
 * same goes for the signed message that tells Pulse 8 Blended Learning about a
 * booking on one of its practical days.
 *
 * `charge.refunded`: a full refund marks the booking refunded, frees its
 * places and tells Blended Learning to cancel every attendee; a partial refund
 * changes nothing and asks staff to review it.
 *
 * Shop orders carry `shop_order_id` in their metadata and are handled in
 * lib/booking/shop-webhook.server.ts, after the same checks above.
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
  if (event.type === "charge.refunded") return refunded(event.data.object as Stripe.Charge);

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
  const shopOrderId = checkout.metadata?.shop_order_id;
  if (shopOrderId) return handleShopCheckout(event.type, checkout, shopOrderId);

  const bookingId = checkout.metadata?.booking_id ?? checkout.client_reference_id ?? null;
  if (!bookingId) return; // Not one of ours.

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
  await sendDueBlendedEvents(orderId);
}

async function refunded(charge: Stripe.Charge) {
  const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!intent) return;
  const order = await getOrderByPaymentIntent(intent);
  if (!order) {
    await handleShopRefund(charge, intent);
    return; // A shop order, or not one of ours.
  }
  if (charge.livemode !== order.livemode || charge.currency !== order.currency) {
    console.error(`[webhook] charge.refunded for ${order.id} did not match the booking`);
    return;
  }

  // Stripe's running total for the charge, so a replay changes nothing.
  const outcome = await markRefunded(order.id, charge.amount_refunded);
  if (outcome.kind === "full") {
    await sendDueBlendedEvents(order.id);
  } else if (outcome.kind === "partial" && outcome.firstTime) {
    const result = await sendRefundReviewEmail(outcome.order, charge.amount_refunded);
    // Nothing else records a partial refund, so let Stripe retry until staff hear of it.
    if (!result.ok) throw new Error(`refund review email failed: ${result.error}`);
    await recordPartialRefund(order.id, charge.amount_refunded);
  }
}
