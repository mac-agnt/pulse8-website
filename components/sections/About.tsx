import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";

const points = [
  {
    title: "Working responders",
    body: "Instructors drawn from paramedics, EMTs, the fire service and first aid instruction.",
  },
  {
    title: "Insured and audited",
    body: "PHECC approval is reassessed, and every session is fully insured.",
  },
  {
    title: "We come to you",
    body: "Training runs at your site, on your dates, anywhere in Ireland.",
  },
  {
    title: "Kit as well as training",
    body: "Defibrillators, cabinets and first aid supplies from the same supplier.",
  },
];

/**
 * The one full-bleed band on the page. The photograph runs to the edge and
 * holds the viewport while the argument scrolls past it, so the section reads
 * as one image with the case set beside it rather than a card in space.
 */
export function About() {
  return (
    <section id="about" className="border-t border-border-soft">
      <div className="grid lg:grid-cols-2">
        <div className="relative min-h-[20rem] lg:sticky lg:top-0 lg:h-[100svh] lg:self-start">
          <Image
            src="/site/about-1.webp"
            alt="A Pulse 8 instructor talking a group through defibrillator use"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-[68%_center]"
          />
          {/* The floating nav sits over this edge on the way past. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/25 to-transparent"
          />
        </div>

        <div className="flex items-center px-5 py-16 md:px-10 md:py-24 lg:py-40 lg:pl-16 xl:pl-20">
          <div className="w-full max-w-[38rem]">
            <Reveal>
              <p className="text-[0.8125rem] font-medium tracking-[0.14em] text-accent uppercase">
                Since 2010
              </p>
              <h2 className="mt-4 text-3xl leading-[1.08] font-semibold sm:text-4xl lg:text-[2.75rem]">
                Instructors who have done the job for real
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-ink-muted">
                The people teaching your staff have worked the back of an ambulance, a fire
                appliance or a hospital floor, so the answer to what happens next comes from
                experience rather than a manual.
              </p>
            </Reveal>

            <RevealGroup className="mt-12 border-t border-border-soft">
              {points.map(({ title, body }) => (
                <RevealItem
                  key={title}
                  className="grid gap-1.5 border-b border-border-soft py-6 sm:grid-cols-[14rem_1fr] sm:gap-8"
                >
                  <h3 className="text-base font-semibold text-ink">{title}</h3>
                  <p className="text-[0.9375rem] leading-relaxed text-ink-muted">{body}</p>
                </RevealItem>
              ))}
            </RevealGroup>

            <Reveal>
              <Link
                href="/book"
                className="group mt-10 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink"
              >
                Book a course
                <ArrowRight
                  size={16}
                  weight="bold"
                  className="text-accent transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
