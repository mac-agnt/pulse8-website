"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarBlank, List, Phone, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { contact, nav } from "@/lib/data";
import { duration, ease } from "@/lib/motion";

/**
 * Floating navigation.
 *
 * On the home page it starts as a glass pill over the hero photograph and
 * turns solid once the page moves under it. Everywhere else it is solid from
 * the first paint. The bar is fixed, so pages set their own top padding.
 */
export function Header({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();

  /**
   * A sentinel at the top of the document rather than a scroll listener: the
   * observer fires twice over a whole page, not on every frame of a scroll.
   */
  useEffect(() => {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText =
      "position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none";
    document.body.prepend(sentinel);

    const observer = new IntersectionObserver(([entry]) => {
      setScrolled(!entry.isIntersecting);
    });
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  const onGlass = overlay && !scrolled && !open;

  return (
    <header className="fixed inset-x-0 top-[var(--header-offset)] z-50 px-3 pt-3 md:px-5 md:pt-4">
      <div
        className={cn(
          "mx-auto flex h-14 w-full max-w-[1240px] items-center justify-between gap-6 rounded-full border py-2 pr-2 pl-4 transition-colors duration-300 md:h-16 md:pl-5",
          onGlass
            ? "border-white/15 bg-white/10 backdrop-blur-xl"
            : "border-border bg-surface/85 shadow-[0_1px_3px_rgb(15_23_42/0.06)] backdrop-blur-xl",
        )}
      >
        {/*
          Two lockups rather than a white plate behind one: the reversed mark
          carries the glass bar, the full-colour one the solid bar. Both are
          rendered and cross-faded so neither has to load on a state change.
        */}
        <Link href="/" className="relative flex h-7 shrink-0 items-center md:h-8">
          <Image
            src="/brand/pulse8-logo.png"
            alt="Pulse 8"
            width={277}
            height={77}
            priority
            className={cn(
              "h-full w-auto transition-opacity duration-300",
              onGlass && "opacity-0",
            )}
          />
          <Image
            src="/brand/pulse8-logo-light.png"
            alt=""
            width={277}
            height={77}
            priority
            aria-hidden="true"
            className={cn(
              "absolute inset-y-0 left-0 h-full w-auto transition-opacity duration-300",
              onGlass ? "opacity-100" : "opacity-0",
            )}
          />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "text-[0.9375rem] transition-colors duration-200",
                onGlass ? "text-white/75 hover:text-white" : "text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <a
            href={contact.phoneHref}
            className={cn(
              "hidden items-center gap-2 text-[0.9375rem] font-medium transition-colors duration-200 md:inline-flex",
              onGlass ? "text-white" : "text-ink",
            )}
          >
            <Phone size={16} weight="bold" className={onGlass ? "text-white/70" : "text-accent"} />
            <span className="figure">{contact.phone}</span>
          </a>

          <Button href="/book" className="hidden rounded-full sm:inline-flex">
            <CalendarBlank size={16} weight="bold" />
            Book a course
          </Button>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className={cn(
              "grid size-10 place-items-center rounded-full border transition-colors duration-200 lg:hidden",
              onGlass ? "border-white/25 text-white" : "border-border text-ink",
            )}
          >
            {open ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="mobile-nav"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: duration.fast, ease }}
            className="mx-auto mt-2 w-full max-w-[1240px] rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[0_8px_30px_rgb(15_23_42/0.08)] lg:hidden"
          >
            <div className="flex flex-col gap-1">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-control)] px-3 py-3 text-base text-ink transition-colors duration-200 hover:bg-tint"
                >
                  {item.label}
                </a>
              ))}
              <Button
                href="/book"
                size="lg"
                className="mt-2 rounded-full"
                onClick={() => setOpen(false)}
              >
                <CalendarBlank size={17} weight="bold" />
                Book a course
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
