import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/sections/AnnouncementBar";
import { Header } from "@/components/sections/Header";
import { Footer } from "@/components/sections/Footer";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import {
  buildSchedule,
  expandExtraSessions,
  isoDate,
  mergeSessions,
} from "@/lib/schedule";
import { readContent } from "@/lib/content.server";

export const metadata: Metadata = {
  title: "Book a course | Pulse 8",
  description:
    "Upcoming first aid, fire safety and manual handling dates with prices on every seat. Filter by course and format, pick a time and book it.",
};

// Anchored to the current date and to a file the dashboard writes, so it
// cannot be baked in.
export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course } = await searchParams;
  const now = new Date();
  const content = await readContent();
  const sessions = mergeSessions(
    buildSchedule(now),
    expandExtraSessions(content.extraSessions, content.courses),
  );

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="pt-[calc(6rem+var(--header-offset))] pb-20 md:pt-[calc(8rem+var(--header-offset))] md:pb-28">
        <div className="shell">
          <p className="text-[0.8125rem] font-medium tracking-[0.14em] text-ink-muted uppercase">
            Course dates
          </p>
          <h1 className="mt-4 max-w-[18ch] text-[2.25rem] leading-[1.06] font-semibold tracking-[-0.032em] sm:text-[2.75rem] lg:text-[3.25rem]">
            Pick a date that suits
          </h1>
          <p className="mt-5 max-w-[54ch] text-lg text-ink-muted">
            Everything running over the next four months, with the price on every date.
            Move through the months, filter to one course, then pick a day to see its
            times.
          </p>
        </div>

        {/* The calendar wants more room than the page shell allows. */}
        <div className="mx-auto mt-10 w-full max-w-[1600px] px-5 md:mt-12 md:px-8">
          <BookingCalendar
            sessions={sessions}
            today={isoDate(now)}
            initialCourse={course}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
