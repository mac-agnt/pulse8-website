import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { PolicyArticle } from "@/components/policies/PolicyArticle";
import { getPolicyPage } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Privacy policy | Pulse 8",
  description: "How Pulse 8 collects, uses and protects your personal data under GDPR and Irish data protection law.",
};

export const revalidate = 3600;

export default function Page() {
  return (
    <PageShell>
      <PolicyArticle page={getPolicyPage("privacy")} />
    </PageShell>
  );
}
