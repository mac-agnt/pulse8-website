import Image from "next/image";
import { PhecMark } from "@/components/ui/PhecMark";
import { ArrowRight, CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/Button";
import { HeroFrame } from "@/components/ui/HeroFrame";
import { Reveal } from "@/components/ui/Reveal";
import { defaultContent, type HeroCopy } from "@/lib/content";

/**
 * Full-height hero. The photograph is the background, a flat scrim carries the
 * type, and the copy sits left in the frame with the training floor open to the
 * right. The entrance is a staggered rise that collapses to the final state
 * under prefers-reduced-motion. HeroFrame owns the white border and curved
 * corners that form around the photograph as the page scrolls.
 *
 * Under the buttons sits PHECC's mark with the text its policy prescribes,
 * linked to phecc.ie (PhecMark; rules in lib/brand.ts). The text is fixed, not
 * a dashboard field, because PHECC prescribes it. Customer logos are not here;
 * they have their own section further down.
 */
const HERO_IMAGE = "/site/hero-bg.jpg";

export function Hero({ copy = defaultContent.hero }: { copy?: HeroCopy }) {
  return (
    <HeroFrame
      media={
        <>
          <Image
            src={HERO_IMAGE}
            alt="A Pulse 8 instructor practising chest compressions on a training manikin while a colleague observes"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[64%_center] md:object-center"
          />
          <div aria-hidden="true" className="hero-scrim absolute inset-0" />
        </>
      }
    >
      <div className="shell relative w-full pt-28 pb-20 md:pt-32 md:pb-24">
        <Reveal onMount>
          <h1 className="max-w-[18ch] text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.035em] text-white sm:text-[3.5rem] lg:text-[4.5rem]">
            {copy.headline.split(/\*([^*]+)\*/g).map((part, index) =>
              index % 2 === 1 ? (
                <span key={index} className="hero-gradient">
                  {part}
                </span>
              ) : (
                part
              ),
            )}
          </h1>
        </Reveal>

        <Reveal onMount delay={0.12}>
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-white/80">
            {copy.subline}
          </p>
        </Reveal>

        <Reveal onMount delay={0.24}>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/book" size="lg" className="w-full sm:w-auto">
              <CalendarBlank size={17} weight="bold" />
              {copy.primaryCta}
            </Button>
            <Button
              href="#courses"
              size="lg"
              variant="onDark"
              className="w-full bg-white/[0.12] sm:w-auto"
            >
              {copy.secondaryCta}
              <ArrowRight size={17} weight="bold" />
            </Button>
          </div>
        </Reveal>

        <Reveal onMount delay={0.32}>
          <div className="mt-8">
            <PhecMark />
          </div>
        </Reveal>
      </div>
    </HeroFrame>
  );
}
