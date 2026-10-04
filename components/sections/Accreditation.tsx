import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/Button";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { clients } from "@/lib/data";

/**
 * Who Pulse 8 has trained, directly under the Overview.
 *
 * One intro card that spans the full height on the left, the client marks as a
 * grid of equal cards beside it. The logos are PNGs with the white knocked out,
 * so they sit straight on the card with no chip. The cards rise in a stagger as
 * the grid enters view.
 */
export function Accreditation() {
  return (
    <section aria-label="Clients" className="px-3 py-3 md:px-5 md:py-5">
      <RevealGroup
        className="mx-auto grid max-w-[1240px] grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:grid-rows-4"
        step={0.05}
      >
        <RevealItem className="col-span-2 flex flex-col justify-between gap-12 rounded-[var(--radius-card)] bg-tint p-6 md:col-span-3 md:p-8 lg:col-span-1 lg:row-span-4">
          <h2 className="text-[2.25rem] leading-none font-semibold tracking-[-0.035em] text-ink md:text-5xl">
            Trusted by
          </h2>
          <div>
            <p className="max-w-[34ch] text-[0.9375rem] leading-relaxed text-ink-muted">
              Schools, colleges, hotels and sports clubs across Ireland book Pulse 8 to
              train their teams on site.
            </p>
            <Button href="#contact" size="lg" className="mt-6 rounded-full">
              Request a quote
              <ArrowRight size={16} weight="bold" />
            </Button>
          </div>
        </RevealItem>

        {clients.map((client) => (
          <RevealItem
            key={client.name}
            className="group grid h-36 place-items-center rounded-[var(--radius-card)] bg-tint px-6 transition-colors duration-200 hover:bg-surface md:h-40 lg:h-auto"
          >
            {client.logo ? (
              <Image
                src={client.logo}
                alt={client.name}
                width={272}
                height={96}
                className="h-14 w-full max-w-40 object-contain transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none"
              />
            ) : (
              <span className="text-center text-[0.9375rem] font-medium tracking-tight text-ink-muted">
                {client.name}
              </span>
            )}
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
