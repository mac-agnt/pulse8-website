import Image from "next/image";
import { clients } from "@/lib/data";

/**
 * The trust band that carries the hero into the page.
 *
 * The client logos. The approval marks are stated once, above the fold in the
 * hero, rather than again here. The top of the section is a gradient pulled up
 * over the last inches of the hero photograph so the frame dissolves into the
 * page rather than ending on a hard line.
 *
 * This is the one marquee on the site. It is CSS only, the track is the list
 * rendered twice so the loop has no seam, and the second copy is hidden from
 * assistive tech. The logos are PNGs with the white knocked out, so they sit
 * straight on the page ground with no chip and no blend mode. Bodies that have
 * not supplied a licensed mark ride along as wordmarks.
 *
 * The PHECC "since 2010" line that used to sit here is not lost: the Facts band
 * further down states it as one of the four figures.
 */

type BandItem = { key: string; name: string; logo?: string };

const items: BandItem[] = clients.map((client) => ({
  key: `client-${client.name}`,
  name: client.name,
  logo: client.logo,
}));

/**
 * The track travels its own width, so the duration has to scale with how many
 * items are on it. Otherwise the band speeds up every time one is added.
 */
const durationSeconds = Math.round(items.length * 3.6);

export function Accreditation() {
  return (
    <section aria-label="Clients" className="relative">
      {/*
        The hero scrim bottoms out at rgb(9 13 28). Starting the fade from
        transparent over that exact frame means the seam has no edge to see.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none -mt-24 h-24 bg-gradient-to-b from-transparent to-bg md:-mt-32 md:h-32"
      />

      <div className="bg-bg pb-16 md:pb-20">
        <p className="shell text-[0.9375rem] text-ink-faint">Training delivered for</p>

        <div className="marquee mt-7 bg-bg">
          <ul
            className="marquee-track"
            style={{ animationDuration: `${durationSeconds}s` }}
          >
            {[...items, ...items].map((item, index) => (
              <li
                key={`${item.key}-${index}`}
                aria-hidden={index >= items.length}
                className="flex min-w-40 shrink-0 items-center justify-center px-4 md:min-w-48"
              >
                {item.logo ? (
                  /*
                    One frame for every mark, with the image fitted inside it.
                    They run from a square shield to a wordmark three times as
                    wide, so a shared height would leave the wide ones enormous
                    and the square ones tiny. Fitting them into a fixed box
                    instead gives the row one optical weight. The box cannot be
                    sized from the file: an <img> with width and height set gets
                    its aspect ratio from those attributes, not from the source.
                  */
                  <Image
                    src={item.logo}
                    alt={item.name}
                    width={272}
                    height={96}
                    className="h-12 w-34 object-contain"
                  />
                ) : (
                  <span className="text-[0.9375rem] font-medium tracking-tight whitespace-nowrap text-ink-faint">
                    {item.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
