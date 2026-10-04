import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/sections/AnnouncementBar";
import { Header } from "@/components/sections/Header";
import { Footer } from "@/components/sections/Footer";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import {
  buildSchedule,
  expandExtraSessions,
  formatDayShort,
  formatPrice,
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

  const todayIso = isoDate(now);
  const upcoming = sessions.filter((session) => session.date >= todayIso);
  const next = upcoming.find((session) => session.seatsLeft > 0);
  const lowest = upcoming.length ? Math.min(...upcoming.map((session) => session.price)) : null;
  const stats = [
    next ? { label: "Next date", value: formatDayShort(next.date) } : null,
    { label: "Dates open", value: String(upcoming.length) },
    lowest !== null ? { label: "Prices from", value: formatPrice(lowest) } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="pb-20 md:pb-28">
        <section className="bg-navy-deep pt-[calc(7.5rem+var(--header-offset))] pb-32 text-on-navy md:pt-[calc(9.5rem+var(--header-offset))] md:pb-44">
          <div className="shell grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <h1 className="max-w-[16ch] text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.035em] text-white sm:text-[3.25rem] lg:text-[4rem]">
                Pick a date that suits
              </h1>
              <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-on-navy-muted">
                Everything running over the next four months, with the price on every
                date. Filter to one course, pick a day, and book your place.
              </p>
            </div>

            <dl className="flex gap-8 border-t border-white/15 pt-6 lg:gap-10 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[0.75rem] font-medium tracking-[0.1em] text-on-navy-muted uppercase">
                    {stat.label}
                  </dt>
                  <dd className="figure mt-2 text-2xl font-semibold text-white md:text-[1.75rem]">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* The calendar wants more room than the page shell allows, and rises over the band. */}
        <div className="relative z-10 mx-auto -mt-20 w-full max-w-[1600px] px-3 md:-mt-28 md:px-8">
          <BookingCalendar
            sessions={sessions}
            today={todayIso}
            initialCourse={course}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
