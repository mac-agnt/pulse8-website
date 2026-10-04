import Image from "next/image";
import Link from "next/link";
import { EnvelopeSimple, MapPin, Phone } from "@phosphor-icons/react/dist/ssr";
import { contact } from "@/lib/data";

/**
 * Two lists without headings: training and the ways in on the left, the
 * company and the shop on the right. The nav landmarks still carry names.
 */
const columns = [
  {
    label: "Training",
    links: [
      { label: "All courses", href: "/courses" },
      { label: "Online courses", href: "/courses#online" },
      { label: "Course dates", href: "/book" },
      { label: "Get a quote", href: "/contact" },
      { label: "FAQs", href: "/#faq" },
    ],
  },
  {
    label: "Company and shop",
    links: [
      { label: "About Pulse 8", href: "/about" },
      { label: "Online store", href: "/shop" },
      { label: "Defibrillators", href: "/shop/defibrillators" },
      { label: "First aid supplies", href: "/shop/first-aid-supplies" },
      { label: "Policies", href: "/policies" },
    ],
  },
];

const legal = [
  { label: "Privacy policy", href: "/policies/privacy" },
  { label: "Cookie policy", href: "/policies/cookies" },
  { label: "Cancellation policy", href: "/policies/cancellation" },
];

const link =
  "text-[1rem] text-on-navy-muted transition-colors duration-200 hover:text-on-navy";

/**
 * Footer as a framed panel, inset from the page by the same margin and curve
 * the hero frame settles into, so the page opens and closes on the same shape.
 * The reversed logo sits straight on the navy, no plate behind it.
 */
export function Footer() {
  return (
    <footer className="p-[var(--frame-inset)]">
      <div className="rounded-[var(--frame-radius)] bg-navy-deep px-6 pt-14 pb-8 sm:px-10 md:pt-16 lg:px-12 xl:px-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4 lg:gap-10">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" aria-label="Pulse 8 home" className="inline-flex">
              <Image
                src="/brand/pulse8-logo-light.png"
                alt="Pulse 8"
                width={277}
                height={77}
                className="h-10 w-auto"
              />
            </Link>
            <p className="mt-6 max-w-[36ch] text-[1rem] leading-relaxed text-on-navy-muted">
              PHECC Approved Training Institute since 2010. First aid, fire safety and manual
              handling training, in your workplace or online.
            </p>
            <p className="mt-7 inline-flex items-center gap-3 text-[0.9375rem] text-on-navy-muted">
              {/* The tricolour, drawn rather than an emoji so it renders the same everywhere. */}
              <span aria-hidden="true" className="flex h-4 w-6 overflow-hidden rounded-[3px]">
                <span className="flex-1 bg-[#169b62]" />
                <span className="flex-1 bg-[#f4f4f2]" />
                <span className="flex-1 bg-[#ff883e]" />
              </span>
              Training across Ireland
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.label} aria-label={column.label}>
              <ul className="flex flex-col gap-4">
                {column.links.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={link}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="col-span-2 lg:col-span-1">
            <ul className="flex flex-col gap-4">
              <li>
                <a href={`mailto:${contact.email}`} className={`${link} inline-flex items-center gap-3.5`}>
                  <EnvelopeSimple size={22} className="shrink-0 text-on-navy" />
                  {contact.email}
                </a>
              </li>
              <li>
                <a href={contact.phoneHref} className={`${link} inline-flex items-center gap-3.5`}>
                  <Phone size={22} className="shrink-0 text-on-navy" />
                  <span className="figure">{contact.phone}</span>
                </a>
              </li>
              <li className="inline-flex items-center gap-3.5 text-[1rem] text-on-navy-muted">
                <MapPin size={22} className="shrink-0 text-on-navy" />
                Dublin, Ireland
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-7 text-[0.875rem] text-on-navy-muted/80 md:mt-16 lg:flex-row lg:items-center lg:justify-between">
          <p>
            &copy; <span className="figure">{new Date().getFullYear()}</span> Pulse 8. All
            rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-7 gap-y-2">
            {legal.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors duration-200 hover:text-on-navy">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
