import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { PageIntro } from "@/components/ui/PageIntro";
import { policyPages, type PolicyPage } from "@/lib/policies";

/**
 * Emails, Irish phone numbers and the site address in policy text become
 * links. Policy copy is stored as plain strings so it can be ported word for
 * word; this is the only formatting it gets.
 */
const LINKABLE = /([\w.+-]+@[\w-]+\.[\w.]+[a-z])|(\b0\d{1,2} \d{3} \d{4}\b)|(https:\/\/pulse8\.ie)/g;

function linkify(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(LINKABLE)) {
    const [value, email, phone] = match;
    const start = match.index ?? 0;
    out.push(text.slice(last, start));

    const href = email
      ? `mailto:${email}`
      : phone
        ? `tel:+353${phone.replace(/\s/g, "").slice(1)}`
        : "/";

    out.push(
      <a
        key={start}
        href={href}
        className="font-medium text-ink underline decoration-border underline-offset-4 transition-colors duration-200 hover:decoration-accent"
      >
        {value}
      </a>,
    );
    last = start + value.length;
  }

  out.push(text.slice(last));
  return out;
}

/**
 * One policy, set as a readable article. A narrow measure, numbered headings
 * carried over from the original documents, and the other two policies linked
 * underneath so nobody has to go back to the index to find them.
 */
export function PolicyArticle({ page }: { page: PolicyPage }) {
  const others = policyPages.filter((item) => item.slug !== page.slug);

  return (
    <>
      <PageIntro
        back={{ href: "/policies", label: "All policies" }}
        label="Policies"
        title={page.title}
      />

      <div className="shell mt-12 md:mt-16">
        <article className="max-w-[68ch] border-t border-border pt-4">
          {page.sections.map((section, index) => (
            <section key={section.heading ?? index} className="mt-8 first:mt-6">
              {section.heading ? (
                <h2 className="text-xl leading-snug font-semibold text-ink">
                  {section.heading}
                </h2>
              ) : null}

              {section.blocks.map((block, blockIndex) =>
                Array.isArray(block) ? (
                  <ul key={blockIndex} className="mt-4 flex flex-col gap-2.5">
                    {block.map((item) => (
                      <li
                        key={item}
                        className="relative pl-5 leading-relaxed text-ink-muted before:absolute before:top-[0.7em] before:left-0 before:size-1.5 before:rounded-full before:bg-accent"
                      >
                        {linkify(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p key={blockIndex} className="mt-4 leading-relaxed text-ink-muted">
                    {linkify(block)}
                  </p>
                ),
              )}
            </section>
          ))}
        </article>

        <nav
          aria-label="Other policies"
          className="mt-16 grid max-w-[68ch] gap-3 border-t border-border pt-8 sm:grid-cols-2"
        >
          {others.map((item) => (
            <Link
              key={item.slug}
              href={`/policies/${item.slug}`}
              className="group flex items-center justify-between gap-4 rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3.5 transition-colors duration-200 hover:border-ink-faint"
            >
              <span className="text-[0.9375rem] font-medium text-ink">{item.title}</span>
              <ArrowRight
                size={16}
                weight="bold"
                className="shrink-0 text-ink-faint transition-[color,transform] duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-accent motion-reduce:group-hover:translate-x-0"
              />
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
