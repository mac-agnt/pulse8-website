import type { Metadata } from "next";
import { CheckCircle, Clock, Warning } from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { getOrderByCheckoutSession } from "@/lib/booking/store.server";
import { formatAmount } from "@/lib/booking/notify.server";
import { formatDayLong } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "Your booking | Pulse 8",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Where Stripe sends the customer back. It only reads: the booking is
 * confirmed by the signed webhook, never by this page, so refreshing or
 * forging the URL changes nothing. Shows the minimum needed, keyed by the
 * unguessable Checkout Session id.
 */
export default async function BookingReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: checkoutId } = await searchParams;
  const order =
    checkoutId && /^cs_[A-Za-z0-9_]{8,200}$/.test(checkoutId)
      ? await getOrderByCheckoutSession(checkoutId)
      : undefined;

  const confirmed = order?.status === "paid";
  const waiting =
    order && (order.status === "pending" || order.status === "processing" || order.status === "exception");

  return (
    <PageShell>
      <div className="shell max-w-[44rem]">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 md:p-10">
          {confirmed && order ? (
            <>
              <CheckCircle size={32} weight="fill" className="text-accent" />
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink">
                Your booking is confirmed
              </h1>
              <p className="mt-3 text-ink-muted">
                A confirmation is on its way to your email. Quote your booking reference if
                you contact us.
              </p>
              <dl className="mt-8 grid gap-4 border-t border-border-soft pt-6 sm:grid-cols-2">
                {[
                  ["Booking reference", order.id],
                  ["Course", order.courseTitle],
                  ["Date", `${formatDayLong(order.sessionDate)}, ${order.sessionStart}`],
                  ["Location", order.venue],
                  ["Places", String(order.quantity)],
                  ["Paid", formatAmount(order.amountTotal, order.currency)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[0.8125rem] text-ink-faint">{label}</dt>
                    <dd className="figure mt-1 font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : waiting ? (
            <>
              <Clock size={32} weight="bold" className="text-ink-faint" />
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink">
                Confirming your payment
              </h1>
              <p className="mt-3 text-ink-muted">
                We&rsquo;re confirming your payment. We&rsquo;ll email you when your booking is
                confirmed.
              </p>
              <Button
                href={`/book/return?session_id=${encodeURIComponent(checkoutId ?? "")}`}
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
                We couldn&rsquo;t find that booking
              </h1>
              <p className="mt-3 text-ink-muted">
                If you paid, you&rsquo;ll get an email from us shortly. Otherwise choose a date
                again, or email info@pulse8.ie.
              </p>
              <Button href="/book" className="mt-6">
                Course dates
              </Button>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
