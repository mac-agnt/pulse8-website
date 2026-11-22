/**
 * Delivery for shop orders: the one place it is set. The basket, Stripe
 * Checkout, the order emails and the automated checks all read it.
 *
 * PLACEHOLDER. The old store's public pages (shop, product, cart, checkout,
 * FAQ, cancellation policy) state no delivery charge, and Pulse 8 has not
 * given one yet. Until they do, delivery within Ireland is charged at zero.
 * When the real rates arrive, change `deliveryCents` and set
 * `DELIVERY_CONFIRMED` to true.
 */
export const DELIVERY_CONFIRMED = false;

/** Orders go to an Irish address with an Eircode. */
export const DELIVERY_AREA = "Ireland";

/** Delivery charge in cents for a basket whose goods come to `subtotalCents`. */
export function deliveryCents(subtotalCents: number): number {
  void subtotalCents;
  return 0;
}
