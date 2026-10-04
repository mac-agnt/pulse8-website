import Link from "next/link";
import { ArrowRight, Plus } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/ui/Reveal";
import { contact, faqs } from "@/lib/data";

/**
 * The last section on the home page, as the old site's FAQ page asked to be.
 *
 * Native details/summary rather than a scripted accordion: it opens without
 * JavaScript, the browser handles keyboard and find-in-page, and several
 * answers can be open at once. The plus turns into a cross and the answer
 * rises in, both transform and opacity only. The same questions go out as
 * FAQPage structured data.
 */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export function Faq() {
  return (
    <section id="faq" className="py-20 md:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="shell grid gap-12 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-4">
          <h2 className="max-w-[16ch] text-3xl leading-[1.1] font-semibold sm:text-4xl">
            Questions before you book
          </h2>
          <p className="mt-5 max-w-[36ch] text-lg text-ink-muted">
            Anything not covered here, ask us on{" "}
            <a href={contact.phoneHref} className="figure font-medium whitespace-nowrap text-ink">
              {contact.phone}
            </a>
            .
          </p>
          <Link
            href="/contact"
            className="group mt-8 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink"
          >
            Contact us
            <ArrowRight
              size={16}
              weight="bold"
              className="text-accent transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            />
          </Link>
        </Reveal>

        <Reveal delay={0.06} className="lg:col-span-8">
          <div className="border-t border-border">
            {faqs.map((item) => (
              <details key={item.question} className="group border-b border-border">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="text-[1.0625rem] leading-snug font-medium text-ink">
                    {item.question}
                  </span>
                  <Plus
                    size={18}
                    weight="bold"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-ink-faint transition-transform duration-200 ease-out group-open:rotate-45 group-open:text-accent"
                  />
                </summary>
                <p className="faq-answer max-w-[62ch] pr-10 pb-6 leading-relaxed text-ink-muted">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
