import Image from "next/image";
import { EnvelopeSimple, Phone } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/ui/Reveal";
import { QuoteForm } from "@/components/sections/QuoteForm";
import { contact } from "@/lib/data";

export function Contact() {
  return (
    <section id="contact" className="relative isolate overflow-hidden bg-navy-deep">
      <Image
        src="/site/hero-bg.jpg"
        alt=""
        fill
        sizes="100vw"
        className="-z-10 object-cover opacity-35"
      />
      <div
        className="absolute inset-0 -z-10 bg-navy-deep/75"
        aria-hidden="true"
      />

      <div className="shell grid gap-12 py-20 md:py-28 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <p className="text-[0.8125rem] font-medium tracking-[0.14em] text-on-navy-muted uppercase">
            Contact
          </p>
          <h2 className="mt-4 text-3xl leading-[1.1] font-semibold text-on-navy sm:text-4xl lg:text-[2.75rem]">
            Tell us what you need trained
          </h2>
          <p className="mt-5 max-w-[42ch] text-lg text-on-navy-muted">
            Scheduled courses are priced and bookable on the dates page. Use this for
            on-site training, where the group size sets the shape of the day.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex items-center gap-3 text-lg text-on-navy"
            >
              <EnvelopeSimple size={20} weight="bold" className="text-on-navy-muted" />
              {contact.email}
            </a>
            <a
              href={contact.phoneHref}
              className="inline-flex items-center gap-3 text-lg text-on-navy"
            >
              <Phone size={20} weight="bold" className="text-on-navy-muted" />
              <span className="figure">{contact.phone}</span>
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-7">
          <QuoteForm />
        </Reveal>
      </div>
    </section>
  );
}
