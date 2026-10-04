import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, EnvelopeSimple, MapPin, Phone } from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/layout/PageShell";
import { PageIntro } from "@/components/ui/PageIntro";
import { Reveal } from "@/components/ui/Reveal";
import { QuoteForm } from "@/components/sections/QuoteForm";
import { contact } from "@/lib/data";

export const metadata: Metadata = {
  title: "Contact | Pulse 8",
  description:
    "Ask Pulse 8 for a quote on first aid, fire safety or manual handling training for your group, or get in touch about a course or an order.",
};

const beforeBooking = [
  { label: "Course dates and prices", href: "/book" },
  { label: "Cancellation policy", href: "/policies/cancellation" },
  { label: "Frequently asked questions", href: "/#faq" },
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course } = await searchParams;

  return (
    <PageShell>
      <PageIntro label="Contact" title="Get in touch">
        A quote for your team, a question about a course or an order from the shop. Call,
        email or use the form and we will come back to you.
      </PageIntro>

      <div className="shell mt-12 grid gap-12 md:mt-16 lg:grid-cols-12 lg:gap-16">
        <Reveal className="flex flex-col gap-10 lg:col-span-5">
          <div className="flex flex-col gap-5 border-t border-border pt-8">
            <a
              href={contact.phoneHref}
              className="inline-flex items-center gap-4 text-ink"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <Phone size={20} weight="bold" />
              </span>
              <span>
                <span className="block text-[0.8125rem] text-ink-faint">Phone</span>
                <span className="figure text-xl font-semibold">{contact.phone}</span>
              </span>
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex items-center gap-4 text-ink"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <EnvelopeSimple size={20} weight="bold" />
              </span>
              <span>
                <span className="block text-[0.8125rem] text-ink-faint">Email</span>
                <span className="text-xl font-semibold">{contact.email}</span>
              </span>
            </a>
          </div>

          <div className="flex gap-4 border-t border-border pt-8">
            <MapPin size={20} weight="bold" className="mt-1 shrink-0 text-ink-faint" />
            <div>
              <h2 className="text-lg font-semibold">Where we train</h2>
              <p className="mt-2 max-w-[40ch] leading-relaxed text-ink-muted">
                Courses run in Dublin and Limerick, and on site at your workplace, school or
                club anywhere in Ireland. Several courses can be done fully online.
              </p>
            </div>
          </div>

          <nav aria-label="Before you book" className="border-t border-border pt-8">
            <h2 className="text-lg font-semibold">Before you book</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {beforeBooking.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink"
                  >
                    {link.label}
                    <ArrowRight
                      size={15}
                      weight="bold"
                      className="text-accent transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Reveal>

        <Reveal delay={0.06} className="lg:col-span-7">
          <div className="rounded-[var(--radius-card)] bg-navy-deep p-6 sm:p-8 md:p-10">
            <h2 className="text-2xl font-semibold text-on-navy">Ask for a quote</h2>
            <p className="mt-2 mb-8 max-w-[48ch] text-on-navy-muted">
              Tell us who needs training and where. Scheduled dates can be booked straight
              from the dates page.
            </p>
            <QuoteForm defaultCourse={course} />
          </div>
        </Reveal>
      </div>
    </PageShell>
  );
}
