import Image from "next/image";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { sectors } from "@/lib/data";

const spans = [
  "sm:col-span-2 lg:col-span-2",
  "sm:col-span-1",
  "sm:col-span-1",
  "sm:col-span-1",
  "sm:col-span-1",
];

export function Sectors() {
  return (
    <section id="sectors" className="py-20 md:py-28">
      <div className="shell">
        <Reveal>
          <h2 className="max-w-[22ch] text-3xl leading-[1.1] font-semibold sm:text-4xl lg:text-[2.75rem]">
            Built around the room you work in
          </h2>
          <p className="mt-5 max-w-[58ch] text-lg text-ink-muted">
            A creche, a hurling club and a nursing home need different things from the same
            four hours. The course is set up for yours.
          </p>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector, index) => (
            <RevealItem key={sector.name} className={spans[index]}>
              <article
                className={`group relative flex h-full min-h-[16rem] flex-col justify-end overflow-hidden rounded-[var(--radius-card)] ${
                  index === 0 ? "lg:min-h-[22rem]" : ""
                }`}
              >
                <Image
                  src={sector.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/80 to-navy-deep/15"
                  aria-hidden="true"
                />
                <div className="relative p-5 lg:p-6">
                  <h3 className="text-xl font-semibold text-on-navy">{sector.name}</h3>
                  <p className="mt-2 max-w-[38ch] text-[0.9375rem] leading-relaxed text-on-navy-muted">
                    {sector.description}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {sector.courses.map((course) => (
                      <li
                        key={course}
                        className="rounded-full border border-white/25 px-2.5 py-1 text-[0.75rem] text-on-navy-muted"
                      >
                        {course}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
