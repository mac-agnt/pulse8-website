import { AnnouncementBar } from "@/components/sections/AnnouncementBar";
import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { Overview } from "@/components/sections/Overview";
import { Accreditation } from "@/components/sections/Accreditation";
import { About } from "@/components/sections/About";
import { Courses } from "@/components/sections/Courses";
import { Sectors } from "@/components/sections/Sectors";
import { Testimonials } from "@/components/sections/Testimonials";
import { Supplies } from "@/components/sections/Supplies";
import { Contact } from "@/components/sections/Contact";
import { Faq } from "@/components/sections/Faq";
import { Footer } from "@/components/sections/Footer";
import { readPublicContent } from "@/lib/content.server";

// The announcement bar reads the live schedule, and the copy comes from a file
// the dashboard writes, so this cannot be baked in.
export const dynamic = "force-dynamic";

/**
 * Order, per the 8 November feedback: hero with its accreditation group, then
 * the training introduction and course discovery, then supporting sections,
 * one "Trusted by" logo group, and the enquiry form last before the footer.
 */
export default async function HomePage() {
  const content = await readPublicContent();
  const courseOptions = content.courses.map(({ slug, title }) => ({ slug, title }));

  return (
    <>
      <AnnouncementBar />
      <Header overlay />
      <main>
        <Hero copy={content.hero} />
        <Overview facts={content.facts} />
        <Courses courses={content.courses} />
        <About process={content.process} />
        <Sectors />
        <Testimonials />
        <Supplies />
        <Faq />
        <Accreditation />
        <Contact courses={courseOptions} />
      </main>
      <Footer />
    </>
  );
}
