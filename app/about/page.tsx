import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  Certificate,
  Check,
  HandHeart,
  Heartbeat,
  Laptop,
  MapTrifold,
  SlidersHorizontal,
} from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { clients, trustFigures } from "@/lib/data";

export const metadata: Metadata = {
  title: "About | Pulse 8",
  description:
    "Pulse 8 is a PHECC Approved Training Institute delivering first aid and health and safety training across Ireland since 2010, taught by paramedics and certified instructors.",
};

export const revalidate = 3600;

/** "Health and safety done right", the six points from the old about page. */
const points = [
  {
    icon: Certificate,
    title: "Certified training",
    body: "Accredited courses meet national standards for workplace safety and compliance.",
  },
  {
    icon: Heartbeat,
    title: "Expert instructors",
    body: "Learn from paramedics and certified trainers with real-world experience.",
  },
  {
    icon: Laptop,
    title: "Flexible learning",
    body: "Choose online or in-person training to fit your schedule and learning needs.",
  },
  {
    icon: SlidersHorizontal,
    title: "Tailored courses",
    body: "Custom courses designed for businesses, schools, sports clubs, and healthcare.",
  },
  {
    icon: HandHeart,
    title: "Hands-on practice",
    body: "Engaging, practical sessions help build confidence in real-life emergencies.",
  },
  {
    icon: MapTrifold,
    title: "Nationwide training",
    body: "Providing first aid and safety training across Ireland with online options.",
  },
];

const reasons = [
  "Certified instructors with real-world experience",
  "Customised training for workplaces, schools and sports",
  "Hands-on, practical learning with valuable takeaways",
];

const figures = [...trustFigures, { value: "2010", label: "PHECC approved since" }];

export default function AboutPage() {
  return (
    <PageShell className="pb-0 md:pb-0">
      <section className="shell grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <Reveal onMount className="lg:col-span-6">
          <p className="text-[0.8125rem] font-medium tracking-[0.14em] text-ink-muted uppercase">
            About Pulse 8
          </p>
          <h1 className="mt-4 max-w-[18ch] text-[2.25rem] leading-[1.06] font-semibold tracking-[-0.032em] sm:text-[2.75rem] lg:text-[3.25rem]">
            Leading health and safety training across Ireland
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink-muted">
            Pulse 8 delivers expert health and safety training, led by experienced paramedics
            and certified instructors. With over 15 years of experience, we provide tailored
            courses for businesses, schools, sports clubs, healthcare, and more.
          </p>
          <p className="mt-4 max-w-[52ch] leading-relaxed text-ink-muted">
            We are an Approved Training Institute with PHECC, the Pre-Hospital Emergency Care
            Council. Our instructors range from paramedics and EMTs to the fire service and
            first aid instructors, and every session is fully insured. We also supply first
            aid kits and defibrillators, so the training and the kit come from one place.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Button href="/courses" size="lg">
              Browse courses
            </Button>
            <Button href="/contact" size="lg" variant="secondary">
              Contact us
            </Button>
          </div>
        </Reveal>

        <Reveal onMount delay={0.1} className="lg:col-span-6">
          <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-tint sm:aspect-[4/3] lg:aspect-square">
            <Image
              src="/site/home-1.jpg"
              alt="An instructor guiding a learner through chest compressions on a training manikin"
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
        </Reveal>
      </section>

      <section aria-label="Pulse 8 in numbers" className="shell mt-20 md:mt-28">
        <RevealGroup className="grid grid-cols-2 gap-x-6 gap-y-10 border-y border-border py-10 md:grid-cols-4 md:py-12">
          {figures.map((figure) => (
            <RevealItem key={figure.label}>
              <p className="figure text-4xl font-semibold text-ink md:text-5xl">{figure.value}</p>
              <p className="mt-2 text-[0.9375rem] text-ink-muted">{figure.label}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <section aria-labelledby="done-right" className="shell mt-20 md:mt-28">
        <Reveal>
          <h2
            id="done-right"
            className="max-w-[20ch] text-3xl leading-[1.1] font-semibold sm:text-4xl lg:text-[2.75rem]"
          >
            Health and safety done right
          </h2>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {points.map(({ icon: Icon, title, body }) => (
            <RevealItem key={title} className="border-t border-border pt-6">
              <Icon size={26} weight="duotone" className="text-accent" />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 max-w-[36ch] text-[0.9375rem] leading-relaxed text-ink-muted">
                {body}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <section aria-labelledby="clients-heading" className="shell mt-20 md:mt-28">
        <Reveal>
          <h2 id="clients-heading" className="text-2xl font-semibold sm:text-3xl">
            Trusted by
          </h2>
        </Reveal>
        <RevealGroup className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-10 md:gap-x-16">
          {clients.map((client) => (
            <RevealItem key={client.name} className="flex h-14 w-[8.5rem] items-center justify-center">
              <Image
                src={client.logo}
                alt={client.name}
                width={200}
                height={80}
                className="h-full w-auto max-w-[9rem] object-contain opacity-80 grayscale transition-[opacity,filter] duration-300 hover:opacity-100 hover:grayscale-0"
              />
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <section
        aria-labelledby="why-heading"
        className="relative isolate mt-24 overflow-hidden bg-navy-deep md:mt-32"
      >
        <Image
          src="/site/about-1.webp"
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover object-[68%_center] opacity-30"
        />
        <div className="absolute inset-0 -z-10 bg-navy-deep/70" aria-hidden="true" />

        <div className="shell grid gap-12 py-20 md:py-28 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-6">
            <h2
              id="why-heading"
              className="max-w-[18ch] text-3xl leading-[1.1] font-semibold text-on-navy sm:text-4xl lg:text-[2.75rem]"
            >
              Why choose Pulse 8 for your first aid training
            </h2>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-on-navy-muted">
              Pulse 8 offers flexible online and in-person first aid courses across Ireland.
              Learn from experienced paramedics and certified trainers, gaining confidence to
              handle emergencies in any situation.
            </p>
          </Reveal>

          <Reveal delay={0.08} className="flex flex-col justify-end lg:col-span-6">
            <ul className="flex flex-col gap-4">
              {reasons.map((reason) => (
                <li key={reason} className="flex gap-3 text-lg text-on-navy">
                  <Check size={20} weight="bold" className="mt-1 shrink-0 text-accent" />
                  {reason}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button href="/book" size="lg">
                Book a course
              </Button>
              <Button href="/contact" size="lg" variant="onDark">
                Contact us
                <ArrowRight size={17} weight="bold" />
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
