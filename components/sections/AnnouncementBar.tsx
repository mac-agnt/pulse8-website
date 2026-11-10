import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { DismissAnnouncement } from "@/components/sections/DismissAnnouncement";
import { dublinNow, formatDayShort, isoDate, type PublicSession } from "@/lib/schedule";
import { getPublicSessions } from "@/lib/sessions.server";

/**
 * Top announcement bar.
 *
 * It announces a real, published date rather than fixed copy (sample dates
 * are skipped, and with no published dates the bar does not render): the next
 * date that is still open, preferring a headline course so the bar is selling
 * First Aid Response rather than whichever short online module happens to fall
 * first. Because the schedule is anchored to today, any page rendering this has
 * to set `revalidate` or the date bakes into the build.
 *
 * Visibility is an attribute on the html element, not React state. It renders
 * open, so the bar survives JavaScript being off, and the inline script below
 * closes it again before the bar is parsed if this visitor already dismissed
 * it. That attribute also drives --header-offset, which is how the fixed header
 * knows to sit underneath.
 *
 * Dismissal is stored against the announced session id, in localStorage rather
 * than sessionStorage: closing it should stick across tabs and visits, but a
 * different course or a different date is a different announcement and gets to
 * appear again.
 */
async function nextOpenSession(now: Date): Promise<PublicSession | undefined> {
  const today = dublinNow(now).date;
  const upcoming = (await getPublicSessions(now)).filter((s) => !s.sample && s.seatsLeft > 0);
  if (upcoming.length === 0) return undefined;

  // Look a fortnight ahead for a flagship date before falling back to the very
  // next thing on the calendar.
  const horizon = upcoming.filter((s) => s.date <= addDaysIso(today, 14));
  const headline = horizon.find((s) => s.certificate === "PHECC");
  return headline ?? upcoming[0];
}

function addDaysIso(iso: string, days: number): string {
  return isoDate(new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * 86_400_000));
}

export async function AnnouncementBar() {
  const session = await nextOpenSession(new Date());
  // Nothing published to announce: drop the attribute so the header does not
  // leave room for a bar that is not there.
  if (!session) {
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: 'document.documentElement.removeAttribute("data-announcement");',
        }}
      />
    );
  }

  const seatsLow = session.seatsLeft <= 3;

  // Runs where it sits, before the bar below it is parsed, so a bar that was
  // already dismissed never paints.
  const dismissInit = `
(function () {
  try {
    if (localStorage.getItem("pulse8-announcement") === ${JSON.stringify(session.id)}) {
      document.documentElement.removeAttribute("data-announcement");
    }
  } catch (e) {}
})();
`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: dismissInit }} />
      <div id="announcement" className="announcement">
        {/* Room on the right so the text never runs under the close button. */}
        <div className="shell flex h-full items-center justify-center gap-3 pr-12 md:pr-16">
        <Link
          href={`/book?course=${session.courseSlug}&session=${encodeURIComponent(session.id)}`}
          className="group flex min-w-0 items-center gap-x-2.5 text-[0.8125rem] text-white/85 md:text-[0.875rem]"
        >
          <span className="shrink-0 font-semibold whitespace-nowrap text-white">
            Next {session.title}
          </span>
          <span aria-hidden="true" className="shrink-0 text-white/30">
            /
          </span>
          <span className="truncate">
            {formatDayShort(session.date)}, {session.start}
            <span className="hidden sm:inline">
              {" "}
              &middot; {session.venue}
            </span>
          </span>
          {seatsLow ? (
            <span className="hidden shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[0.75rem] font-medium text-white md:inline">
              {session.seatsLeft} {session.seatsLeft === 1 ? "seat" : "seats"} left
            </span>
          ) : null}
          <span className="ml-1 hidden shrink-0 items-center gap-1 font-medium text-white underline-offset-4 group-hover:underline sm:inline-flex">
            {session.action === "book" ? "Book a place" : "View date"}
            <ArrowRight size={13} weight="bold" />
          </span>
        </Link>
        </div>

        <DismissAnnouncement sessionId={session.id} />
      </div>
    </>
  );
}
