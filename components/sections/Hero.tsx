import Image from "next/image";
import { ArrowRight, CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/Button";
import { HeroFrame } from "@/components/ui/HeroFrame";
import { Reveal } from "@/components/ui/Reveal";
import { heroAccreditation } from "@/lib/brand";
import { defaultContent, type HeroCopy } from "@/lib/content";

/**
 * Full-height hero. The photograph is the background, a flat scrim carries the
 * type, and the copy sits left in the frame with the training floor open to the
 * right. The entrance is a staggered rise that collapses to the final state
 * under prefers-reduced-motion. HeroFrame owns the white border and curved
 * corners that form around the photograph as the page scrolls.
 *
 * Under the buttons sits the compact accreditation group: the PHECC mark
 * beside the ATI label (and the ATI artwork, once Pulse 8 supplies it, see
 * lib/brand.ts). The label is the dashboard's hero "eyebrow" field. Customer
 * logos are not here; they have their own section further down.
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
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex items-center gap-2">
              {/* A light plate, so the full-colour marks hold contrast on the photograph. */}
              <span className="flex h-11 items-center rounded-[var(--radius-control)] bg-surface px-2.5">
                <Image
                  src={heroAccreditation.phecc.src}
                  alt={heroAccreditation.phecc.alt}
                  width={heroAccreditation.phecc.width}
                  height={heroAccreditation.phecc.height}
                  className="h-7 w-auto"
                />
              </span>
              {heroAccreditation.ati ? (
                <span className="flex h-11 items-center rounded-[var(--radius-control)] bg-surface px-2.5">
                  <Image
                    src={heroAccreditation.ati.src}
                    alt={heroAccreditation.ati.alt}
                    width={heroAccreditation.ati.width}
                    height={heroAccreditation.ati.height}
                    className="h-7 w-auto"
                  />
                </span>
              ) : null}
            </div>
            <p className="max-w-[30ch] text-[0.875rem] leading-snug font-medium text-white/85">
              {copy.eyebrow}
            </p>
          </div>
        </Reveal>
      </div>
    </HeroFrame>
  );
}
