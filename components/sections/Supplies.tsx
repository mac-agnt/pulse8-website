import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { supplies } from "@/lib/data";

export function Supplies() {
  return (
    <section id="equipment" className="border-t border-border-soft py-20 md:py-28">
      <div className="shell grid gap-10 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <h2 className="text-3xl leading-[1.1] font-semibold sm:text-4xl">
            The kit, from the same people
          </h2>
          <p className="mt-5 max-w-[42ch] text-lg text-ink-muted">
            Training a team is half of it. Pulse 8 also supplies and restocks what the
            training assumes is on the wall.
          </p>
        </Reveal>

        <RevealGroup className="lg:col-span-7">
          <ul className="border-t border-border">
            {supplies.map((item) => (
              <RevealItem key={item.name}>
                <li>
                  <a
                    href={item.href}
                    className="group flex items-center justify-between gap-6 border-b border-border py-6 transition-colors duration-200 hover:bg-tint/60"
                  >
                    <span>
                      <span className="block text-xl font-semibold">{item.name}</span>
                      <span className="mt-1.5 block text-[0.9375rem] text-ink-muted">
                        {item.description}
                      </span>
                    </span>
                    <ArrowUpRight
                      size={22}
                      weight="bold"
                      className="shrink-0 text-ink-faint transition-colors duration-200 group-hover:text-accent"
                    />
                  </a>
                </li>
              </RevealItem>
            ))}
          </ul>
        </RevealGroup>
      </div>
    </section>
  );
}
