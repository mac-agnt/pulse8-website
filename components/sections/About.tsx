"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarBlank,
  Certificate,
  FirstAidKit,
  MapPin,
  ShieldCheck,
} from "@phosphor-icons/react";
import {
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { defaultContent, type ProcessCopy } from "@/lib/content";

const credentials = [
  {
    icon: Certificate,
    title: "PHECC approved",
    body: "An Approved Training Institute with the Pre-Hospital Emergency Care Council since 2010.",
  },
  {
    icon: ShieldCheck,
    title: "Fully insured",
    body: "Every instructor and every session, wherever the course runs.",
  },
  {
    icon: MapPin,
    title: "We come to you",
    body: "Workplaces, schools and clubs anywhere in Ireland, on dates that suit you.",
  },
  {
    icon: FirstAidKit,
    title: "The kit as well",
    body: "Defibrillators, cabinets and first aid supplies from",
    link: { label: "our own shop", href: "/shop" },
  },
];

/**
 * One step on the rail. The segment under its number fills as the reader moves
 * down the list, and the next number lights when the segment reaches it, so the
 * sequence is read in order rather than taken in as three equal columns.
 * Transform and opacity only; under reduced motion globals.css pins both to
 * their finished state.
 */
function Step({
  index,
  count,
  progress,
  title,
  body,
}: {
  index: number;
  count: number;
  progress: MotionValue<number>;
  title: string;
  body: string;
}) {
  const span = 1 / Math.max(count - 1, 1);
  const start = index * span;
  const lit = useTransform(progress, [Math.max(start - 0.06, 0), Math.max(start, 0.02)], [0, 1]);
  const segment = useTransform(progress, [start, start + span], [0, 1]);
  const last = index === count - 1;
  const number = String(index + 1).padStart(2, "0");

  return (
    <li className={cn("relative grid grid-cols-[2.75rem_1fr] gap-x-5", !last && "pb-11")}>
      {!last ? (
        <span aria-hidden="true" className="absolute top-11 bottom-0 left-[1.375rem] w-px bg-border">
          <motion.span
            style={{ scaleY: segment }}
            className="process-fill absolute inset-0 origin-top bg-accent"
          />
        </span>
      ) : null}

      <span
        aria-hidden="true"
        className="figure relative grid size-11 place-items-center rounded-full border border-border bg-bg text-[0.9375rem] font-semibold text-ink-faint"
      >
        {number}
        <motion.span
          style={{ opacity: lit }}
          className="process-dot absolute -inset-px grid place-items-center rounded-full bg-accent text-on-accent"
        >
          {number}
        </motion.span>
      </span>

      <div className="pt-2">
        <h4 className="text-lg leading-snug font-semibold text-ink">
          <span className="sr-only">Step {index + 1}: </span>
          {title}
        </h4>
        <p className="mt-2 max-w-[44ch] text-[0.9375rem] leading-relaxed text-ink-muted">
          {body}
        </p>
      </div>
    </li>
  );
}

/**
 * Who teaches, then how it runs, as one argument.
 *
 * The photograph runs to the edge and holds the viewport while the column
 * scrolls past it. It starts on an instructor at the front of a room and
 * crossfades to learners practising once the booking steps come into view, so
 * the picture follows the copy instead of sitting still beside it. The steps
 * are a single rail that fills in as it is read. Step copy comes from the
 * content file, so the dashboard at /admin can change it.
 */
export function About({ process = defaultContent.process }: { process?: ProcessCopy }) {
  const howRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const onSteps = useInView(howRef, { amount: 0.3 });

  const { scrollYProgress } = useScroll({
    target: railRef,
    offset: ["start 90%", "end 78%"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 320, damping: 34, restDelta: 0.001 });

  return (
    <section id="about" className="border-t border-border-soft">
      <div className="grid lg:grid-cols-2">
        <div className="relative min-h-[22rem] lg:sticky lg:top-0 lg:h-[100svh] lg:self-start">
          <div className="absolute inset-0 overflow-hidden bg-navy-deep">
            <Image
              src="/site/about-1.webp"
              alt="A Pulse 8 instructor talking a group through defibrillator use"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={cn(
                "object-cover object-[68%_center] transition-opacity duration-700 ease-out",
                onSteps ? "opacity-0" : "opacity-100",
              )}
            />
            <Image
              src="/site/home-1.jpg"
              alt=""
              aria-hidden="true"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={cn(
                "object-cover object-center transition-opacity duration-700 ease-out",
                onSteps ? "opacity-100" : "opacity-0",
              )}
            />
          </div>
          {/* The floating nav sits over this edge on the way past. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/25 to-transparent"
          />
        </div>

        <div className="px-5 py-16 md:px-10 md:py-24 lg:py-32 lg:pl-16 xl:pl-20">
          <div className="w-full max-w-[38rem]">
            <Reveal>
              <p className="text-[0.8125rem] font-medium tracking-[0.14em] text-ink-muted uppercase">
                Since 2010
              </p>
              <h2 className="mt-4 max-w-[16ch] text-3xl leading-[1.08] font-semibold sm:text-4xl lg:text-[2.75rem]">
                Taught by paramedics, firefighters and EMTs
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-ink-muted">
                The people at the front of the room are paramedics, EMTs, firefighters and
                occupational first aid instructors. Ask what happens when it goes wrong and
                you get an answer from experience, not a slide deck.
              </p>
            </Reveal>

            <RevealGroup className="mt-12 grid gap-x-10 gap-y-9 border-t border-border pt-10 sm:grid-cols-2">
              {credentials.map(({ icon: Icon, title, body, link }) => (
                <RevealItem key={title}>
                  <Icon size={24} weight="duotone" className="text-accent" />
                  <h3 className="mt-3.5 text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-muted">
                    {body}
                    {link ? (
                      <>
                        {" "}
                        <Link
                          href={link.href}
                          className="font-medium text-ink underline decoration-border underline-offset-4 transition-colors duration-200 hover:decoration-accent"
                        >
                          {link.label}
                        </Link>
                        .
                      </>
                    ) : null}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>

            <div
              id="how"
              ref={howRef}
              className="mt-20 border-t border-border pt-14 md:mt-24"
            >
              <Reveal>
                <h3 className="max-w-[20ch] text-2xl leading-tight font-semibold sm:text-3xl">
                  {process.heading}
                </h3>
              </Reveal>

              <ol ref={railRef} className="mt-10">
                {process.steps.map((step, index) => (
                  <Step
                    key={step.title}
                    index={index}
                    count={process.steps.length}
                    progress={progress}
                    title={step.title}
                    body={step.body}
                  />
                ))}
              </ol>

              <Reveal>
                <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-4">
                  <Button href="/book" size="lg">
                    <CalendarBlank size={17} weight="bold" />
                    Book a course
                  </Button>
                  <Link
                    href="/contact"
                    className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink"
                  >
                    Get a quote for your team
                    <ArrowRight
                      size={16}
                      weight="bold"
                      className="text-accent transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    />
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
