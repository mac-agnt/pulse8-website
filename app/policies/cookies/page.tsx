import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { PolicyArticle } from "@/components/policies/PolicyArticle";
import { getPolicyPage } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Cookie policy | Pulse 8",
  description: "What the Pulse 8 website stores in your browser and how to control it.",
};

export const revalidate = 3600;

export default function Page() {
  return (
    <PageShell>
      <PolicyArticle page={getPolicyPage("cookies")} />
    </PageShell>
  );
}
