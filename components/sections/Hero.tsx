import Image from "next/image";
import { ArrowRight, CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { defaultContent, type HeroCopy } from "@/lib/content";

/**
 * Full-height hero. The photograph is the background, a flat scrim carries the
 * type, and the copy sits left in the frame with the training floor open to the
 * right. The entrance is a staggered rise that collapses to the final state
 * under prefers-reduced-motion.
 */
const HERO_IMAGE = "/site/hero-bg.jpg";

export function Hero({ copy = defaultContent.hero }: { copy?: HeroCopy }) {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden"
    >
      <Image
        src={HERO_IMAGE}
        alt="A Pulse 8 instructor practising chest compressions on a training manikin while a colleague observes"
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[64%_center] md:object-center"
      />
      <div aria-hidden="true" className="hero-scrim absolute inset-0 -z-10" />

      <div className="shell w-full pt-28 pb-20 md:pt-32 md:pb-24">
        <Reveal onMount>
          <p className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[0.75rem] font-medium tracking-[0.02em] text-white/80 backdrop-blur-sm">
            {copy.eyebrow}
          </p>
        </Reveal>

        <Reveal onMount delay={0.12}>
          <h1 className="mt-6 max-w-[16ch] text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.035em] text-white sm:text-[3.5rem] lg:text-[4.5rem]">
            {copy.headline}
          </h1>
        </Reveal>

        <Reveal onMount delay={0.24}>
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-white/75">
            {copy.subline}
          </p>
        </Reveal>

        <Reveal onMount delay={0.36}>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button
              href="/book"
              size="lg"
              variant="onDark"
              className="w-full bg-white/10 backdrop-blur-sm sm:w-auto"
            >
              <CalendarBlank size={17} weight="bold" />
              {copy.primaryCta}
            </Button>
            <Button
              href="#courses"
              size="lg"
              variant="onDark"
              className="w-full bg-white/10 backdrop-blur-sm sm:w-auto"
            >
              {copy.secondaryCta}
              <ArrowRight size={17} weight="bold" />
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
