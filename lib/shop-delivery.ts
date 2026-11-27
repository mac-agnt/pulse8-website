/**
 * Delivery for shop orders. The rates are set by staff in /admin (Prices),
 * stored with the rest of the admin content, and passed in here; this file
 * holds only the rule, so the basket (in the browser), Stripe Checkout, the
 * order emails and the automated checks all work it out the same way.
 *
 * Until staff confirm the rates in the dashboard, delivery within Ireland is
 * charged at zero and staff emails flag it.
 */

/** Orders go to an Irish address with an Eircode. */
export const DELIVERY_AREA = "Ireland";

export type DeliveryRates = {
  /** euro per order */
  flatEuro: number;
  /** free delivery when the goods come to at least this, in euro; null for never */
  freeOverEuro: number | null;
  /** false until staff have saved real rates */
  confirmed: boolean;
};

export const defaultDeliveryRates: DeliveryRates = { flatEuro: 0, freeOverEuro: null, confirmed: false };

/** Delivery charge in cents for a basket whose goods come to `subtotalCents`. */
export function deliveryCents(subtotalCents: number, rates: DeliveryRates = defaultDeliveryRates): number {
  if (subtotalCents <= 0) return 0;
  if (rates.freeOverEuro !== null && subtotalCents >= Math.round(rates.freeOverEuro * 100)) return 0;
  return Math.max(0, Math.round(rates.flatEuro * 100));
}

/** "€6.50 per order, free over €100. Ireland only." for staff and customers. */
export function describeDelivery(rates: DeliveryRates): string {
  const flat = rates.flatEuro > 0 ? `€${rates.flatEuro.toFixed(2)} per order` : "Free";
  const free = rates.flatEuro > 0 && rates.freeOverEuro !== null ? `, free over €${rates.freeOverEuro.toFixed(2)}` : "";
  return `${flat}${free}. ${DELIVERY_AREA} only.`;
}
