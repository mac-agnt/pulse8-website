import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/sections/AnnouncementBar";
import { Header } from "@/components/sections/Header";
import { Footer } from "@/components/sections/Footer";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { readPublicContent } from "@/lib/content.server";
import { fixturesEnabled, getPublicSessions } from "@/lib/sessions.server";
import { dublinNow, formatDayShort } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "Upcoming course dates | Pulse 8",
  description:
    "Find an upcoming first aid, fire safety or manual handling course by date, course or delivery format.",
};

// Anchored to the current date and to a file the dashboard writes, so it
// cannot be baked in.
export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; format?: string; session?: string; cancelled?: string }>;
}) {
  const { course, format, session, cancelled } = await searchParams;
  const [sessions, content] = await Promise.all([getPublicSessions(), readPublicContent()]);
  const courses = content.courses
    .map(({ slug, title }) => ({ slug, title }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const next = sessions.find((item) => item.seatsLeft > 0);
  const stats = [
    next ? { label: "Next date", value: formatDayShort(next.date) } : null,
    { label: "Dates open", value: String(sessions.length) },
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
                Upcoming course dates
              </h1>
              <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-on-navy-muted">
                Find an upcoming course by date, course or delivery format.
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
            courses={courses}
            today={dublinNow().date}
            initialCourse={course}
            initialFormat={format}
            initialSession={session}
            cancelled={cancelled === "1"}
            sampleMode={fixturesEnabled()}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
