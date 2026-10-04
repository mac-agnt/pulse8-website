import type { ReactNode } from "react";
import { AnnouncementBar } from "@/components/sections/AnnouncementBar";
import { Header } from "@/components/sections/Header";
import { Footer } from "@/components/sections/Footer";
import { cn } from "@/lib/cn";

/**
 * Frame for every page that is not the home page.
 *
 * The header is fixed and solid here, so the page clears it with its own top
 * padding, the same amount the booking page uses. The announcement bar reads a
 * date-anchored schedule, so any page using this shell should export a
 * `revalidate` or the date bakes into the build.
 */
export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main
        className={cn(
          "pt-[calc(6rem+var(--header-offset))] pb-20 md:pt-[calc(8rem+var(--header-offset))] md:pb-28",
          className,
        )}
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
