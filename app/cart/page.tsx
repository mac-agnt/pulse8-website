import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { PageIntro } from "@/components/ui/PageIntro";
import { BasketView } from "@/components/shop/BasketView";
import { paymentConfig } from "@/lib/booking/config.server";

export const metadata: Metadata = {
  title: "Your basket | Pulse 8 shop",
  robots: { index: false },
};

// Whether the shop takes payment is read per request, like the booking pages.
export const dynamic = "force-dynamic";

/** The basket lives in the browser, so everything below the title is client side. */
export default function CartPage() {
  const payments = paymentConfig() !== null;
  return (
    <PageShell>
      <PageIntro
        back={{ href: "/shop", label: "Continue shopping" }}
        label="Online store"
        title="Your basket"
      />

      <div className="shell mt-10 md:mt-12">
        <BasketView payments={payments} />
      </div>
    </PageShell>
  );
}
