import type { ReactNode } from "react";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

/**
 * The opening block of an inner page: an optional way back, a small label, the
 * page title and one short paragraph. Same scale as the booking page, so every
 * inner page starts at the same height.
 */
export function PageIntro({
  label,
  title,
  children,
  back,
  className,
}: {
  label?: string;
  title: string;
  children?: ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("shell", className)}>
      {back ? (
        <Link
          href={back.href}
          className="group mb-6 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-ink-muted transition-colors duration-200 hover:text-ink"
        >
          <CaretLeft
            size={14}
            weight="bold"
            className="transition-transform duration-200 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          />
          {back.label}
        </Link>
      ) : null}

      {label ? (
        <p className="text-[0.8125rem] font-medium tracking-[0.14em] text-ink-muted uppercase">
          {label}
        </p>
      ) : null}

      <h1
        className={cn(
          "max-w-[20ch] text-[2.25rem] leading-[1.06] font-semibold tracking-[-0.032em] sm:text-[2.75rem] lg:text-[3.25rem]",
          label && "mt-4",
        )}
      >
        {title}
      </h1>

      {children ? (
        <div className="mt-5 max-w-[56ch] text-lg text-ink-muted">{children}</div>
      ) : null}
    </div>
  );
}
