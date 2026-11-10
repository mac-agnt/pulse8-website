"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarBlank, Phone, SignIn, Storefront } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { DropdownNavigation } from "@/components/ui/dropdown-navigation";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { navItems } from "@/components/sections/navMenus";
import { BasketLink } from "@/components/shop/BasketLink";
import { logo } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { contact } from "@/lib/data";
import { studentLoginUrl } from "@/lib/site-config";
import { duration, ease } from "@/lib/motion";

/**
 * Floating navigation.
 *
 * On the home page it starts as a bare, borderless bar across the hero
 * photograph. Once the page moves it condenses into a narrower frosted pill
 * with a border and shadow, and the contents tighten with it. Everywhere else
 * it is the frosted pill from the first paint. The bar is fixed, so pages set
 * their own top padding.
 *
 * Below lg the links move into a full-screen sheet opened by the animated
 * menu button; the page behind it is locked while it is open, and Escape
 * closes it and puts focus back on the button.
 *
 * Student login appears only once its destination is configured (see
 * lib/site-config.ts).
 */
export function Header({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  /**
   * A sentinel at the top of the document rather than a scroll listener: the
   * observer fires twice over a whole page, not on every frame of a scroll.
   */
  useEffect(() => {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText =
      "position:absolute;top:0;left:0;width:1px;height:12px;pointer-events:none";
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

  // Lock the page behind the open sheet, and let Escape close it.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onGlass = overlay && !scrolled && !open;

  return (
    <header className="fixed inset-x-0 top-[var(--header-offset)] z-50 px-3 pt-3 md:px-5 md:pt-4">
      <div
        className={cn(
          "mx-auto flex h-14 w-full items-center justify-between gap-4 rounded-full border py-2 pr-2 pl-4 transition-[max-width,background-color,border-color,box-shadow] duration-300 ease-out md:h-16 md:pl-5",
          scrolled ? "max-w-[1080px]" : "max-w-[1240px]",
          onGlass
            ? "border-transparent bg-transparent"
            : "border-border bg-surface/85 shadow-[0_1px_3px_rgb(15_23_42/0.06)] backdrop-blur-xl",
          scrolled && !open && "shadow-[0_10px_30px_-12px_rgb(15_23_42/0.18)]",
        )}
      >
        {/*
          Two lockups rather than a white plate behind one: the reversed mark
          carries the bare bar, the full-colour one the frosted bar. Both are
          rendered and cross-faded so neither has to load on a state change.
        */}
        {/*
          About 30% taller than the first build's mark on desktop (32px to
          42px), capped at 32px on phones and at 36px between 1024 and 1279px,
          where the full nav leaves no more room. The box is fixed and the artwork's
          own ratio sets the width, so nothing shifts when it loads.
        */}
        <Link
          href="/"
          className="relative flex h-8 shrink-0 items-center md:h-[2.625rem] lg:h-9 xl:h-[2.625rem]"
        >
          <Image
            src={logo.onLight.src}
            alt={logo.onLight.alt}
            width={logo.onLight.width}
            height={logo.onLight.height}
            priority
            className={cn(
              "h-full w-auto transition-opacity duration-300",
              onGlass && "opacity-0",
            )}
          />
          <Image
            src={logo.onDark.src}
            alt=""
            width={logo.onDark.width}
            height={logo.onDark.height}
            priority
            aria-hidden="true"
            className={cn(
              "absolute inset-y-0 left-0 h-full w-auto transition-opacity duration-300",
              onGlass ? "opacity-100" : "opacity-0",
            )}
          />
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <DropdownNavigation items={navItems} onGlass={onGlass} />
        </nav>

        <div className="flex items-center gap-2 md:gap-3 lg:gap-2 xl:gap-3">
          {studentLoginUrl ? (
            <a
              href={studentLoginUrl}
              aria-label="Student login"
              title="Student login"
              className={cn(
                // Icon only between 1024 and 1279px, where the bar has no room for the words.
                "hidden size-10 shrink-0 items-center justify-center gap-1.5 rounded-full border text-[0.9375rem] font-medium whitespace-nowrap transition-colors duration-200 lg:inline-flex xl:size-auto xl:rounded-none xl:border-0",
                onGlass
                  ? "border-white/25 text-white/85 hover:text-white"
                  : "border-border text-ink-muted hover:text-ink",
              )}
            >
              <SignIn size={16} weight="bold" />
              <span className="hidden xl:inline">Student login</span>
            </a>
          ) : null}

          <a
            href={contact.phoneHref}
            className={cn(
              "hidden items-center gap-2 text-[0.9375rem] font-medium transition-colors duration-200 2xl:inline-flex",
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

          <BasketLink onGlass={onGlass} />

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className={cn(
              "grid size-10 place-items-center rounded-full border transition-colors duration-200 lg:hidden",
              onGlass ? "border-white/25 text-white" : "border-border text-ink",
            )}
          >
            <MenuToggleIcon open={open} className="size-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-sheet"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: duration.fast, ease }}
            className="fixed inset-x-0 top-[calc(var(--header-offset)+5rem)] bottom-0 overflow-y-auto border-t border-border bg-surface/95 backdrop-blur-xl lg:hidden"
          >
            <div className="mx-auto flex min-h-full max-w-[1240px] flex-col gap-6 px-5 py-6 md:px-8">
              <ul className="flex flex-col">
                {navItems.map((item) => (
                  <li key={item.label} className="border-b border-border-soft py-3">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "inline-flex items-center gap-2 text-xl font-semibold tracking-[-0.02em] text-ink",
                        item.variant === "outlined" &&
                          "rounded-full border border-border px-4 py-1.5 text-lg",
                      )}
                    >
                      {item.variant === "outlined" ? <Storefront size={18} weight="bold" /> : null}
                      {item.label}
                    </Link>
                    {item.subMenus ? (
                      <div className="mt-3 flex flex-col gap-4">
                        {item.subMenus.map((group) => (
                          <div key={group.title}>
                            <p className="text-[0.75rem] font-medium tracking-[0.08em] text-ink-faint uppercase">
                              {group.title}
                            </p>
                            <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2.5 min-[380px]:grid-cols-2">
                              {group.items.map((entry) => (
                                <li key={entry.label}>
                                  <Link
                                    href={entry.href}
                                    onClick={() => setOpen(false)}
                                    {...(entry.external
                                      ? { target: "_blank", rel: "noopener noreferrer" }
                                      : {})}
                                    className="text-[0.9375rem] text-ink-muted transition-colors duration-200 hover:text-ink"
                                  >
                                    {entry.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
                {studentLoginUrl ? (
                  <li className="border-b border-border-soft py-3">
                    <a
                      href={studentLoginUrl}
                      className="inline-flex items-center gap-2 text-xl font-semibold tracking-[-0.02em] text-ink"
                    >
                      <SignIn size={18} weight="bold" />
                      Student login
                    </a>
                  </li>
                ) : null}
              </ul>

              <div className="mt-auto flex flex-col gap-3">
                <a
                  href={contact.phoneHref}
                  className="inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink"
                >
                  <Phone size={16} weight="bold" className="text-accent" />
                  <span className="figure">{contact.phone}</span>
                </a>
                <Button
                  href="/book"
                  size="lg"
                  className="w-full rounded-full"
                  onClick={() => setOpen(false)}
                >
                  <CalendarBlank size={17} weight="bold" />
                  Book a course
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
