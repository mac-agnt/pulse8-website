import { AnnouncementBar } from "@/components/sections/AnnouncementBar";
import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { Overview } from "@/components/sections/Overview";
import { Accreditation } from "@/components/sections/Accreditation";
import { About } from "@/components/sections/About";
import { Courses } from "@/components/sections/Courses";
import { Sectors } from "@/components/sections/Sectors";
import { BoldStats } from "@/components/sections/BoldStats";
import { Testimonials } from "@/components/sections/Testimonials";
import { Supplies } from "@/components/sections/Supplies";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";
import { readContent } from "@/lib/content.server";

// The announcement bar reads the live schedule, and the copy comes from a file
// the dashboard writes, so this cannot be baked in.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const content = await readContent();

  return (
    <>
      <AnnouncementBar />
      <Header overlay />
      <main>
        <Hero copy={content.hero} />
        <Overview facts={content.facts} />
        <Accreditation />
        <About />
        <Courses courses={content.courses} />
        <Sectors />
        <BoldStats facts={content.facts} process={content.process} />
        <Testimonials />
        <Supplies />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
