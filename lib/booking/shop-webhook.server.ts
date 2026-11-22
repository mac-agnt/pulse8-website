import "server-only";
import type Stripe from "stripe";
import { sendDueShopEmails } from "@/lib/booking/shop-notify.server";
import {
  closeShopOrder,
  flagShopException,
  getShopOrder,
  getShopOrderByPaymentIntent,
  markShopPaid,
  markShopProcessing,
  markShopRefunded,
} from "@/lib/booking/shop-store.server";

/**
 * The shop's share of the Stripe webhook (app/api/stripe/webhook/route.ts
 * checks the signature, the mode and the event id first). Same rules as
 * bookings: the Checkout Session must match the order it names, or staff
 * review it; paid is idempotent; emails go after the order is committed.
 */

function paymentIntentId(checkout: Stripe.Checkout.Session): string | undefined {
  const value = checkout.payment_intent;
  return typeof value === "string" ? value : value?.id;
}

export async function handleShopCheckout(
  type:
    | "checkout.session.completed"
    | "checkout.session.async_payment_succeeded"
    | "checkout.session.async_payment_failed"
    | "checkout.session.expired",
  checkout: Stripe.Checkout.Session,
  orderId: string,
): Promise<void> {
  const order = await getShopOrder(orderId);
  if (!order) {
    console.error(`[webhook] ${type} names unknown shop order ${orderId}`);
    return;
  }

  const mismatch =
    order.mode !== "payment" ||
    (order.checkoutSessionId && order.checkoutSessionId !== checkout.id) ||
    checkout.livemode !== order.livemode ||
    (type !== "checkout.session.expired" &&
      (checkout.amount_total !== order.amountTotal || checkout.currency !== order.currency));

  if (mismatch) {
    if (checkout.payment_status === "paid") {
      await flagShopException(
        order.id,
        "Stripe session did not match the order (amount, currency or session). Reconcile before sending anything.",
      );
      await sendDueShopEmails(order.id);
    }
    console.error(`[webhook] ${type} for shop order ${order.id} did not match the order`);
    return;
  }

  switch (type) {
    case "checkout.session.completed":
      if (checkout.payment_status === "paid") {
        await markShopPaid(order.id, paymentIntentId(checkout));
        await sendDueShopEmails(order.id);
      } else {
        await markShopProcessing(order.id, paymentIntentId(checkout));
      }
      return;
    case "checkout.session.async_payment_succeeded":
      await markShopPaid(order.id, paymentIntentId(checkout));
      await sendDueShopEmails(order.id);
      return;
    case "checkout.session.async_payment_failed":
      await closeShopOrder(order.id, "failed");
      return;
    case "checkout.session.expired":
      await closeShopOrder(order.id, "expired");
      return;
  }
}

/** True when the refunded charge belonged to a shop order (handled here). */
export async function handleShopRefund(charge: Stripe.Charge, intent: string): Promise<boolean> {
  const order = await getShopOrderByPaymentIntent(intent);
  if (!order) return false;
  if (charge.livemode !== order.livemode || charge.currency !== order.currency) {
    console.error(`[webhook] charge.refunded for shop order ${order.id} did not match the order`);
    return true;
  }
  // Staff made the refund in Stripe; the order just records it.
  await markShopRefunded(order.id, charge.amount_refunded);
  return true;
}
