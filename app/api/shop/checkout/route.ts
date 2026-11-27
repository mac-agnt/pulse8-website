import { NextResponse } from "next/server";
import { CHECKOUT_EXPIRY_MINUTES, paymentConfig, returnOrigin } from "@/lib/booking/config.server";
import { sendDueShopEmails } from "@/lib/booking/shop-notify.server";
import {
  attachShopCheckout,
  closeShopOrder,
  createShopOrder,
  type ShopCustomer,
} from "@/lib/booking/shop-store.server";
import { stripeClient } from "@/lib/booking/stripe.server";
import { lineLabel, priceBasket } from "@/lib/shop-pricing";
import { readShopPriceList } from "@/lib/content.server";
import { clientKey, emailAddress, multiLine, phoneNumber, rateLimited, singleLine } from "@/lib/validate.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FAILED = "We couldn't send your order. Please try again or email info@pulse8.ie.";
const BASKET = "Something in your basket is no longer available as it was. Check your basket and try again.";

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** An Irish Eircode: routing key and unique identifier, with or without the space. */
function eircode(value: unknown): string | null {
  const raw = singleLine(value, 10)?.toUpperCase().replace(/\s+/g, "");
  if (!raw || !/^[A-Z][0-9][0-9W][0-9A-Z]{4}$/.test(raw)) return null;
  return `${raw.slice(0, 3)} ${raw.slice(3)}`;
}

function readCustomer(body: Record<string, unknown>): ShopCustomer | null {
  const name = singleLine(body.name, 120);
  const email = emailAddress(body.email);
  const phone = phoneNumber(body.phone);
  const organisation = singleLine(body.organisation ?? "", 160);
  const address = multiLine(body.address, 500);
  const code = eircode(body.eircode);
  const notes = multiLine(body.notes ?? "", 1000);
  if (!name || !email || !phone || organisation === null || !address || !code || notes === null) return null;
  return { name, email, phone, organisation, address, eircode: code, notes };
}

/**
 * Places a shop order.
 *
 * The browser sends which products, options and quantities, and who is
 * ordering; every amount comes from the catalogue here (lib/shop-pricing.ts).
 *
 * Payments on (the same switch as course bookings): the order is created
 * `pending` and the customer goes to Stripe Checkout. Only the signed webhook
 * marks it paid. Payments off: the order is created `requested` and emailed
 * to staff and the customer, and it succeeds only once staff have the email.
 * Either way a repeat of the same attempt reuses the same order.
 */
export async function POST(request: Request) {
  if (rateLimited(`shop:${clientKey(request)}`, 10, 10 * 60_000)) {
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

  const attemptKey = singleLine(body.attemptKey, 100);
  if (!attemptKey || !/^[A-Za-z0-9-]{8,100}$/.test(attemptKey)) return fail(400, FAILED);
  if (body.consent !== true) return fail(400, "Tick the privacy policy box before sending.");

  const customer = readCustomer(body);
  if (!customer) return fail(400, "Check your name, email, phone, delivery address and Eircode, then try again.");

  const priceList = await readShopPriceList();
  const priced = priceBasket(body.lines, priceList);
  if (!priced) return fail(400, BASKET);

  const config = paymentConfig();
  const stripe = config ? stripeClient() : null;
  const mode = config && stripe ? "payment" : "request";

  let created;
  try {
    created = await createShopOrder({
      attemptKey,
      mode,
      lines: priced.lines,
      subtotal: priced.subtotal,
      delivery: priced.delivery,
      customer,
      livemode: config?.livemode ?? false,
      deliveryConfirmed: priceList.delivery.confirmed,
    });
  } catch (error) {
    console.error("[shop] could not record the order:", (error as Error).message);
    return fail(503, FAILED);
  }
  const { order, reused } = created;

  if (mode === "request" || !config || !stripe) {
    // Sends whatever has not gone yet, so a retry after a failed email resends it.
    const after = await sendDueShopEmails(order.id);
    if (after?.emails.staff.status !== "sent") return fail(502, FAILED);
    return NextResponse.json({ requested: true, reference: order.id });
  }

  if (reused && order.checkoutUrl) return NextResponse.json({ url: order.checkoutUrl });

  const origin = returnOrigin(request.headers.get("origin"));
  if (!origin) {
    await closeShopOrder(order.id, "failed");
    return fail(503, FAILED);
  }

  try {
    const metadata = { shop_order_id: order.id };
    const lineItems = order.lines.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency: config.currency,
        unit_amount: line.unitAmount,
        product_data: { name: lineLabel(line) },
      },
    }));
    if (order.delivery > 0) {
      lineItems.push({
        quantity: 1,
        price_data: { currency: config.currency, unit_amount: order.delivery, product_data: { name: "Delivery" } },
      });
    }

    const checkout = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: customer.email,
        client_reference_id: order.id,
        metadata,
        payment_intent_data: { metadata, description: `Pulse 8 shop order ${order.id}` },
        line_items: lineItems,
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRY_MINUTES * 60 + 30,
        success_url: `${origin}/cart/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cart?cancelled=1`,
      },
      { idempotencyKey: `shop-checkout-${order.id}` },
    );

    if (!checkout.url) throw new Error("Stripe returned no Checkout URL.");
    await attachShopCheckout(order.id, { id: checkout.id, url: checkout.url, expiresAt: checkout.expires_at });
    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("[shop] Stripe error:", (error as Error).message);
    await closeShopOrder(order.id, "failed").catch(() => undefined);
    return fail(502, FAILED);
  }
}
