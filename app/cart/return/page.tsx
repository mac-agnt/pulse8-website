import type { Metadata } from "next";
import { CheckCircle, Clock, Warning } from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/layout/PageShell";
import { ClearBasket } from "@/components/shop/ClearBasket";
import { Button } from "@/components/ui/Button";
import { formatAmount } from "@/lib/booking/notify.server";
import { getShopOrderByCheckoutSession } from "@/lib/booking/shop-store.server";

export const metadata: Metadata = {
  title: "Your order | Pulse 8 shop",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Where Stripe sends a shop customer back. Like the booking return page it
 * only reads: the order is confirmed by the signed webhook, never here, keyed
 * by the unguessable Checkout Session id. The basket is emptied once the
 * payment is in or settling, so a cancelled payment keeps it.
 */
export default async function ShopReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: checkoutId } = await searchParams;
  const order =
    checkoutId && /^cs_[A-Za-z0-9_]{8,200}$/.test(checkoutId)
      ? await getShopOrderByCheckoutSession(checkoutId)
      : undefined;

  const confirmed = order?.status === "paid";
  const waiting =
    order && (order.status === "pending" || order.status === "processing" || order.status === "exception");

  return (
    <PageShell>
      {confirmed || order?.status === "processing" ? <ClearBasket /> : null}
      <div className="shell max-w-[44rem]">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-10">
          {confirmed && order ? (
            <>
              <CheckCircle size={32} weight="fill" className="text-accent" />
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink">
                Thanks, your order is in
              </h1>
              <p className="mt-3 text-ink-muted">
                A confirmation is on its way to your email, and we&rsquo;ll be in touch about
                delivery. Quote your order reference if you contact us.
              </p>
              <dl className="mt-8 grid gap-4 border-t border-border-soft pt-6 sm:grid-cols-2">
                {[
                  ["Order reference", order.id],
                  ["Items", String(order.lines.reduce((sum, line) => sum + line.quantity, 0))],
                  ["Paid", formatAmount(order.amountTotal, order.currency)],
                  ["Deliver to", order.customer.eircode],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[0.8125rem] text-ink-faint">{label}</dt>
                    <dd className="figure mt-1 font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <Button href="/shop" variant="secondary" className="mt-8">
                Back to the shop
              </Button>
            </>
          ) : waiting ? (
            <>
              <Clock size={32} weight="bold" className="text-ink-faint" />
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink">
                Confirming your payment
              </h1>
              <p className="mt-3 text-ink-muted">
                We&rsquo;re confirming your payment. We&rsquo;ll email you when your order is
                confirmed.
              </p>
              <Button
                href={`/cart/return?session_id=${encodeURIComponent(checkoutId ?? "")}`}
                variant="secondary"
                className="mt-6"
              >
                Check again
              </Button>
            </>
          ) : (
            <>
              <Warning size={32} weight="bold" className="text-ink-faint" />
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink">
                We couldn&rsquo;t find that order
              </h1>
              <p className="mt-3 text-ink-muted">
                If you paid, you&rsquo;ll get an email from us shortly. Otherwise your basket is
                still saved, or email info@pulse8.ie.
              </p>
              <Button href="/cart" className="mt-6">
                Your basket
              </Button>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
