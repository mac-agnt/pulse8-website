import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, DownloadSimple, FilePdf } from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/layout/PageShell";
import { PageIntro } from "@/components/ui/PageIntro";
import { Reveal } from "@/components/ui/Reveal";
import { policyDocuments, policyPages } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Policies | Pulse 8",
  description:
    "Pulse 8 learner policies, student charter and code of conduct, plus our cancellation, privacy and cookie policies.",
};

export const revalidate = 3600;

export default function PoliciesPage() {
  return (
    <PageShell>
      <PageIntro label="Policies" title="Policies and learner documents">
        How we run our courses, look after your data and handle cancellations. The learner
        documents are the versions issued in August 2025.
      </PageIntro>

      <div className="shell mt-14 grid gap-16 md:mt-20 lg:grid-cols-12 lg:gap-12">
        <Reveal className="lg:col-span-4">
          <h2 className="text-2xl leading-tight font-semibold">Booking and this website</h2>
          <ul className="mt-6 border-t border-border">
            {policyPages.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/policies/${page.slug}`}
                  className="group flex items-center justify-between gap-6 border-b border-border py-5"
                >
                  <span>
                    <span className="block text-lg font-semibold text-ink">{page.title}</span>
                    <span className="mt-1 block text-[0.9375rem] leading-relaxed text-ink-muted">
                      {page.summary}
                    </span>
                  </span>
                  <ArrowRight
                    size={18}
                    weight="bold"
                    className="shrink-0 text-ink-faint transition-[color,transform] duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-accent motion-reduce:group-hover:translate-x-0"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.06} className="lg:col-span-8">
          <h2 className="text-2xl leading-tight font-semibold">Learner policies</h2>
          <p className="mt-3 max-w-[52ch] text-[0.9375rem] leading-relaxed text-ink-muted">
            The policies every Pulse 8 learner is covered by, as PDFs.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {policyDocuments.map((doc) => (
              <li key={doc.code}>
                <a
                  href={doc.href}
                  target="_blank"
                  rel="noopener"
                  className="group flex h-full items-center gap-4 rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3.5 transition-colors duration-200 hover:border-ink-faint"
                >
                  <FilePdf size={26} weight="duotone" className="shrink-0 text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] leading-snug font-medium text-ink">
                      {doc.title}
                    </span>
                    <span className="figure mt-0.5 block text-[0.8125rem] text-ink-faint">
                      {doc.code}, {doc.issued}
                    </span>
                  </span>
                  <DownloadSimple
                    size={18}
                    weight="bold"
                    aria-hidden="true"
                    className="shrink-0 text-ink-faint transition-colors duration-200 group-hover:text-accent"
                  />
                  <span className="sr-only">(PDF, opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </PageShell>
  );
}
