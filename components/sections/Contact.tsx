import Image from "next/image";
import { EnvelopeSimple, Phone, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/ui/Reveal";
import { QuoteForm, type CourseOption } from "@/components/sections/QuoteForm";
import { contact } from "@/lib/data";
import { whatsappUrl } from "@/lib/site-config";

export function Contact({ courses }: { courses: CourseOption[] }) {
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
            Tell us who needs training and where. We&rsquo;ll help you find the right
            course or arrange training for your team.
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
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 text-lg text-on-navy"
              >
                <WhatsappLogo size={20} weight="bold" className="text-on-navy-muted" />
                Message us on WhatsApp
                <span className="sr-only">(opens WhatsApp)</span>
              </a>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-7">
          <QuoteForm courses={courses} idPrefix="home-enquiry" />
        </Reveal>
      </div>
    </section>
  );
}
