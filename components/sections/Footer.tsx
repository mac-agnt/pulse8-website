import Image from "next/image";
import { contact } from "@/lib/data";

const columns = [
  {
    heading: "Training",
    links: [
      { label: "All courses", href: "https://pulse8.ie/courses/" },
      { label: "E-learning", href: "https://pulse8.ie/e-learning-courses/" },
      { label: "FAQs", href: "https://pulse8.ie/faqs/" },
    ],
  },
  {
    heading: "Shop",
    links: [
      { label: "Defibrillators", href: "https://pulse8.ie/defibrillators/" },
      { label: "First aid supplies", href: "https://pulse8.ie/first-aid-supplies/" },
      { label: "Schools", href: "https://pulse8.ie/schools/" },
      { label: "Workplace", href: "https://pulse8.ie/workplace/" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "https://pulse8.ie/about/" },
      { label: "Policies", href: "https://pulse8.ie/policies/" },
      { label: "Contact", href: "/#contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-navy-deep">
      <div className="shell border-t border-white/12 py-14">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <span className="inline-flex rounded-[10px] bg-white px-3 py-2">
              <Image
                src="/brand/pulse8-logo-default.png"
                alt="Pulse 8"
                width={280}
                height={70}
                className="h-8 w-auto"
              />
            </span>
            <p className="mt-5 max-w-[34ch] text-[0.9375rem] leading-relaxed text-on-navy-muted">
              PHECC Approved Training Institute. First aid, fire safety and manual handling
              training across Ireland.
            </p>
            <div className="mt-6 flex flex-col gap-1.5 text-[0.9375rem] text-on-navy">
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
              <a href={contact.phoneHref} className="figure">
                {contact.phone}
              </a>
            </div>
          </div>

          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="lg:col-span-2">
              <h3 className="text-[0.875rem] font-semibold text-on-navy">
                {column.heading}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[0.9375rem] text-on-navy-muted transition-colors duration-200 hover:text-on-navy"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/12 pt-6 text-[0.8125rem] text-on-navy-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Pulse 8 Training, Dublin, Ireland</p>
          <p>
            <span className="figure">{new Date().getFullYear()}</span> Pulse 8. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
