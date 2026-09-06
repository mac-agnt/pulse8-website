import Image from "next/image";
import { ArrowRight, CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { accreditations, type Fact } from "@/lib/data";
import { defaultContent } from "@/lib/content";

/**
 * Split panel, directly under the hero.
 *
 * Paper on one side carrying the claim, the accreditation marks under it, and
 * a photograph on the other holding the three figures that back the claim up.
 * The headline is two tone: words wrapped in *asterisks* are promoted out of
 * the muted base into full ink, which is how the sentence gets its emphasis
 * without hard coding a span per phrase.
 */
const PANEL_IMAGE = "/site/hero.webp";

const HEADLINE =
  "*Pulse 8* puts *certified first aid*, fire safety and manual handling training *into your workplace*, on your dates, anywhere in *Ireland*.";

function Headline({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  const emphasised = parts.length > 1;

  return (
    <h2
      className={`text-[1.875rem] leading-[1.16] font-semibold tracking-[-0.03em] sm:text-[2.25rem] lg:text-[2.5rem] ${
        emphasised ? "text-ink-faint" : "text-ink"
      }`}
    >
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="text-ink">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </h2>
  );
}

export function Overview({ facts = defaultContent.facts }: { facts?: Fact[] }) {
  // Training since, courses, rating. The PHECC mark sits in the row underneath.
  const panelFacts = facts.filter((fact) => fact.value !== "PHECC").slice(0, 3);

  return (
    <section
      id="overview"
      aria-label="What Pulse 8 does"
      className="grid border-t border-border-soft lg:grid-cols-2"
    >
      <div className="order-2 flex items-center px-5 py-16 md:px-10 md:py-20 lg:order-1 lg:py-24 lg:pl-16 xl:pl-20">
        <div className="w-full max-w-[36rem]">
          <Reveal>
            <Headline text={HEADLINE} />
            <hr className="mt-9 border-border" />
            <p className="mt-8 max-w-[46ch] text-lg leading-relaxed text-ink-muted">
              PHECC Approved Training Institute since 2010. Dates are published up front, so
              you can book a place without making a phone call.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Button href="/book" size="lg">
                <CalendarBlank size={17} weight="bold" />
                Book a course
              </Button>
              <a
                href="#courses"
                className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink"
              >
                Browse courses
                <ArrowRight
                  size={16}
                  weight="bold"
                  className="text-accent transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-14">
              <p className="text-[0.75rem] font-medium tracking-[0.16em] text-ink-faint uppercase">
                Accredited by
              </p>
              <ul className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-5">
                {accreditations.map((body) => (
                  <li key={body.name}>
                    {body.logo ? (
                      /* Fitted box, not a shared height: these marks run from a
                         square shield to a wordmark three times as wide. */
                      <Image
                        src={body.logo}
                        alt={body.name}
                        width={272}
                        height={96}
                        className="h-8 w-[4.5rem] object-contain"
                      />
                    ) : (
                      /* Same box height as the marks, so the row stays level. */
                      <span className="flex h-8 items-center text-[0.9375rem] font-medium tracking-tight whitespace-nowrap text-ink-faint">
                        {body.name}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="relative order-1 min-h-[22rem] overflow-hidden lg:order-2 lg:min-h-full">
        <Image
          src={PANEL_IMAGE}
          alt="Chest compressions being practised during a Pulse 8 course"
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-center"
        />
        <div aria-hidden="true" className="hero-scrim absolute inset-0" />

        <div className="relative flex h-full flex-col justify-between p-6 md:p-10">
          <dl className="grid grid-cols-3 gap-4 md:gap-6">
            {panelFacts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-[0.6875rem] font-medium tracking-[0.16em] text-white/60 uppercase">
                  {fact.label}
                </dt>
                <dd className="figure mt-2 text-2xl font-semibold text-white md:text-[2rem]">
                  {fact.value}
                </dd>
                <p className="mt-1.5 text-[0.8125rem] leading-snug text-white/65">
                  {fact.note}
                </p>
              </div>
            ))}
          </dl>

          <p className="mt-10 text-[0.6875rem] font-medium tracking-[0.16em] text-white/60 uppercase">
            PHECC Approved Training Institute
          </p>
        </div>
      </div>
    </section>
  );
}
