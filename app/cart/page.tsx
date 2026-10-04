import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { PageIntro } from "@/components/ui/PageIntro";
import { BasketView } from "@/components/shop/BasketView";

export const metadata: Metadata = {
  title: "Your basket | Pulse 8 shop",
  robots: { index: false },
};

// The announcement bar in the page shell is date-anchored.
export const revalidate = 3600;

/** The basket lives in the browser, so everything below the title is client side. */
export default function CartPage() {
  return (
    <PageShell>
      <PageIntro
        back={{ href: "/shop", label: "Continue shopping" }}
        label="Online store"
        title="Your basket"
      />

      <div className="shell mt-10 md:mt-12">
        <BasketView />
      </div>
    </PageShell>
  );
}
