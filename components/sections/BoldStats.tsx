import Image from "next/image";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { defaultContent, type Fact, type ProcessCopy } from "@/lib/content";

/**
 * A lead figure paired with the photograph, the remaining figures on one line
 * under it, then the booking steps in the same figure-first rhythm. Copy comes
 * from the content file, so the dashboard at /admin can change all of it.
 */
export function BoldStats({
  facts = defaultContent.facts,
  process = defaultContent.process,
}: {
  facts?: Fact[];
  process?: ProcessCopy;
}) {
  const [lead, ...rest] = facts;
  if (!lead) return null;

  return (
    <section
      id="how"
      aria-label="Pulse 8 in numbers and how booking works"
      className="py-20 md:py-28"
    >
      <div className="shell flex flex-col gap-16 md:gap-20">
        <Reveal>
          <div className="items-center justify-between gap-8 border-b border-border pb-10 md:flex">
            <div className="flex flex-col items-baseline gap-4 md:flex-row md:gap-7">
              <span className="figure shrink-0 text-7xl font-semibold text-ink sm:text-8xl lg:text-9xl">
                {lead.value}
              </span>
              <div className="max-w-xs">
                <h3 className="text-xl font-semibold">{lead.label}</h3>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-muted">
                  {lead.note}
                </p>
              </div>
            </div>
            <div className="relative mt-8 h-52 w-full shrink-0 overflow-hidden rounded-[var(--radius-card)] sm:w-96 md:mt-0">
              <Image
                src="/site/about-2.webp"
                alt="Learners working through the Pulse 8 online training portal"
                fill
                sizes="(min-width: 640px) 24rem, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </Reveal>

        <RevealGroup className="grid grid-cols-3 gap-4 sm:gap-5 md:flex md:justify-between">
          {rest.map((fact) => (
            <RevealItem key={fact.label}>
              <p className="figure mb-2 text-2xl font-semibold text-ink sm:text-4xl md:text-5xl">
                {fact.value}
              </p>
              <p className="text-[0.6875rem] font-semibold tracking-widest text-ink-muted uppercase sm:text-[0.75rem]">
                {fact.label}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>

        <div className="border-t border-border pt-12 md:pt-16">
          <Reveal>
            <h2 className="max-w-[20ch] text-3xl leading-[1.1] font-semibold sm:text-4xl lg:text-[2.75rem]">
              {process.heading}
            </h2>
          </Reveal>

          <RevealGroup className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8" step={0.09}>
            {process.steps.map((step, index) => (
              <RevealItem key={step.title}>
                <p className="figure mb-3 text-4xl font-semibold text-accent md:text-5xl">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 max-w-[38ch] text-[0.9375rem] leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
