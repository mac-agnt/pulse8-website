import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { PolicyArticle } from "@/components/policies/PolicyArticle";
import { getPolicyPage } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Cancellation policy | Pulse 8",
  description: "Notice periods and fees for cancelling or changing a Pulse 8 course booking.",
};

export const revalidate = 3600;

export default function Page() {
  return (
    <PageShell>
      <PolicyArticle page={getPolicyPage("cancellation")} />
    </PageShell>
  );
}
