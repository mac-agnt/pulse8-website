/**
 * Content for the Pulse 8 landing page.
 *
 * Course names, durations, class sizes, delivery modes, certificates, client
 * list and testimonials are all taken from the live pulse8.ie pages so nothing
 * here is invented. Four durations on the live site look like copy-paste
 * duplicates of the 18-hour First Aid Response entry and are marked
 * `unverified` below — confirm with Pulse 8 before this goes to production.
 *
 * PRICES ARE PLACEHOLDER. Pulse 8 publishes no per-seat prices, so every
 * `price` below is a plausible Irish market rate, not a quoted one. Confirm the
 * full list with Pulse 8 before launch.
 */

export type Delivery = "Classroom" | "Online" | "Blended";

export type Course = {
  slug: string;
  title: string;
  blurb: string;
  duration: string;
  /** euro, per person. PLACEHOLDER, see the note at the top of this file */
  price: number;
  /** true when the live-site duration looks wrong and needs client confirmation */
  unverifiedDuration?: boolean;
  maxParticipants?: number;
  delivery: Delivery;
  certificate?: string;
  image: string;
  /** shown as the lead credential chip on the card */
  headline?: boolean;
};

export const courses: Course[] = [
  {
    slug: "first-aid-response-phecc",
    price: 275,
    title: "First Aid Response",
    blurb:
      "The HSA-recognised standard for occupational first aid. Assessment on practical skills and a written paper.",
    duration: "18 hours",
    maxParticipants: 8,
    delivery: "Classroom",
    certificate: "PHECC",
    image: "/courses/first-aid-response.webp",
    headline: true,
  },
  {
    slug: "first-aid-response-recertification",
    price: 195,
    title: "First Aid Response Recertification",
    blurb:
      "Renews an existing FAR certificate through recognition of prior learning. Certificate valid two years.",
    duration: "12 hours",
    maxParticipants: 8,
    delivery: "Classroom",
    certificate: "PHECC",
    image: "/courses/basic-first-aid.webp",
  },
  {
    slug: "cardiac-first-response",
    price: 95,
    title: "Cardiac First Response",
    blurb:
      "Half day CFR course covering chest compressions, rescue breaths and AED use on adults and children.",
    duration: "4 hours",
    maxParticipants: 6,
    delivery: "Classroom",
    certificate: "PHECC",
    image: "/courses/cardiac-first-response.jpg",
    headline: true,
  },
  {
    slug: "basic-first-aid",
    price: 85,
    title: "Basic First Aid",
    blurb:
      "Patient assessment, CPR and choking for adults, children and infants, plus the recovery position.",
    duration: "4 hours",
    maxParticipants: 12,
    delivery: "Classroom",
    certificate: "Certificate of attendance",
    image: "/courses/basic-first-aid.webp",
  },
  {
    slug: "paediatric-first-aid",
    price: 110,
    title: "Paediatric First Aid",
    blurb:
      "Child and infant CPR, choking and incident procedures. Built for creches, montessoris and childminders.",
    duration: "3 to 6 hours",
    maxParticipants: 12,
    delivery: "Blended",
    certificate: "Certificate of attendance",
    image: "/courses/paediatric-first-aid.webp",
    headline: true,
  },
  {
    slug: "school-first-aid-course",
    price: 95,
    title: "School First Aid",
    blurb:
      "Written for the injuries that actually happen in schools, from yard falls to allergic reactions.",
    duration: "2 to 5 hours",
    maxParticipants: 12,
    delivery: "Classroom",
    certificate: "Pulse 8 certificate",
    image: "/courses/school-first-aid.jpg",
  },
  {
    slug: "sports-first-aid",
    price: 110,
    title: "Sports First Aid",
    blurb:
      "Pitch-side response for clubs. EMS activation, patient assessment, adult and child CPR, AED and choking.",
    duration: "5 hours",
    maxParticipants: 12,
    delivery: "Classroom",
    certificate: "Pulse 8 certificate",
    image: "/courses/sports-first-aid.webp",
  },
  {
    slug: "cpr-for-family-friends",
    price: 45,
    title: "CPR for Family and Friends",
    blurb:
      "A short evening session for people who want to be useful at home rather than certified for work.",
    duration: "2 hours",
    maxParticipants: 10,
    delivery: "Classroom",
    certificate: "PHECC",
    image: "/courses/cpr-family-friends.webp",
  },
  {
    slug: "emergency-first-aid-at-work-online",
    price: 45,
    title: "Emergency First Aid at Work",
    blurb:
      "The most common workplace emergencies, covered online with an in-person practical option.",
    duration: "150 minutes",
    delivery: "Blended",
    image: "/courses/emergency-first-aid-online.jpg",
  },
  {
    slug: "fire-marshal",
    price: 95,
    title: "Fire Marshal",
    blurb:
      "Everything a nominated fire marshal needs to carry out the role, including evacuation duties.",
    duration: "220 minutes",
    maxParticipants: 8,
    delivery: "Blended",
    certificate: "CPD, 5 units",
    image: "/courses/fire-marshal.jpg",
  },
  {
    slug: "fire-safety-awareness",
    price: 55,
    title: "Fire Safety Awareness",
    blurb:
      "Two and a half hours on prevention, extinguisher selection and getting a building emptied calmly.",
    duration: "2.5 hours",
    maxParticipants: 12,
    delivery: "Blended",
    certificate: "Certificate of attendance",
    image: "/courses/fire-safety-awareness.webp",
  },
  {
    slug: "manual-handling-training",
    price: 35,
    title: "Manual Handling",
    blurb:
      "Theory delivered through our online portal, with a practical assessment where the role requires it.",
    duration: "75 minutes",
    delivery: "Online",
    image: "/courses/manual-handling.webp",
  },
  {
    slug: "patient-moving-handling-course",
    price: 185,
    title: "Patient Moving and Handling",
    blurb:
      "How to move patients safely, particularly elderly or incapacitated people, without injuring staff.",
    duration: "18 hours",
    unverifiedDuration: true,
    maxParticipants: 8,
    delivery: "Classroom",
    certificate: "PHECC",
    image: "/courses/patient-moving-handling.webp",
  },
  {
    slug: "workplace-health-and-safety",
    price: 245,
    title: "Workplace Health and Safety",
    blurb:
      "Duties, risk assessment and reporting, so responsibility sits with people who understand it.",
    duration: "18 hours",
    unverifiedDuration: true,
    maxParticipants: 8,
    delivery: "Blended",
    certificate: "PHECC",
    image: "/courses/workplace-health-safety.jpg",
  },
  {
    slug: "vdu-training",
    price: 120,
    title: "VDU Assessment",
    blurb:
      "For anyone responsible for display screen assessments. Covers the assessment itself and the paperwork.",
    duration: "24 hours",
    unverifiedDuration: true,
    maxParticipants: 14,
    delivery: "Classroom",
    certificate: "Pulse 8 certificate",
    image: "/courses/vdu-training.webp",
  },
  {
    slug: "safeguarding-children",
    price: 30,
    title: "Safeguarding Children",
    blurb:
      "Recognising concerns and knowing the reporting route. Required across childcare, schools and clubs.",
    duration: "75 minutes",
    delivery: "Online",
    certificate: "CPD",
    image: "/courses/safeguarding-children.jpg",
  },
  {
    slug: "equality-diversity-and-discrimination",
    price: 30,
    title: "Equality, Diversity and Discrimination",
    blurb:
      "What the words mean in practice, and where the legal line sits for an Irish employer.",
    duration: "70 minutes",
    delivery: "Online",
    certificate: "CPD",
    image: "/courses/equality-diversity.jpg",
  },
  {
    slug: "level-1-food-safety-manufacturing",
    price: 30,
    title: "Level 1 Food Safety, Manufacturing",
    blurb:
      "Food handler basics for manufacturing settings. Approved by CPD, IIRSM, Gatehouse Awards and IOSH.",
    duration: "80 minutes",
    delivery: "Online",
    certificate: "Pulse 8 certificate",
    image: "/courses/food-safety-level-1.webp",
  },
];

export const deliveryFilters: Array<"All" | Delivery> = [
  "All",
  "Classroom",
  "Blended",
  "Online",
];

export type Sector = {
  name: string;
  description: string;
  image: string;
  courses: string[];
};

export const sectors: Sector[] = [
  {
    name: "Schools",
    description:
      "Whole-staff training on the injuries that happen in a yard, a lab or a PE hall.",
    image: "/courses/school-first-aid.jpg",
    courses: ["School First Aid", "Cardiac First Response", "Fire Marshal"],
  },
  {
    name: "Childcare",
    description:
      "Paediatric cover for creches, montessoris and childminders, plus safeguarding.",
    image: "/courses/paediatric-first-aid.webp",
    courses: ["Paediatric First Aid", "Safeguarding Children"],
  },
  {
    name: "Healthcare",
    description:
      "Patient handling and responder training for nursing homes and care providers.",
    image: "/courses/patient-moving-handling.webp",
    courses: ["Patient Moving and Handling", "First Aid Response"],
  },
  {
    name: "Sports clubs",
    description: "Pitch-side response for coaches, committee members and volunteers.",
    image: "/courses/sports-first-aid.webp",
    courses: ["Sports First Aid", "Cardiac First Response"],
  },
  {
    name: "Workplaces",
    description:
      "Occupational first aid, fire marshals and manual handling to meet HSA duties.",
    image: "/site/home-1.jpg",
    courses: ["First Aid Response", "Manual Handling", "Fire Marshal"],
  },
];

export type Fact = { value: string; label: string; note: string };

export const facts: Fact[] = [
  { value: "2010", label: "Training since", note: "Sixteen years in the field" },
  { value: "PHECC", label: "Approved Training Institute", note: "Assessed and audited" },
  { value: "18", label: "Courses", note: "Classroom, blended and online" },
  { value: "5.0", label: "Google rating", note: "From verified reviews" },
];

export type Testimonial = { quote: string; name: string; role: string; avatar: string };

export const testimonials: Testimonial[] = [
  {
    quote:
      "Great course, clear instruction, and useful skills. I highly recommend Pulse 8 for first aid training.",
    name: "James Fitzpatrick",
    role: "First Aid Response",
    avatar: "/people/james-fitzpatrick.png",
  },
  {
    quote:
      "The instructors were excellent. The mix of theory and hands-on practice made all the difference.",
    name: "Mary Kate Doyle",
    role: "Paediatric First Aid",
    avatar: "/people/mary-kate-doyle.png",
  },
  {
    quote:
      "Pulse 8's training was engaging and practical. I feel confident handling emergencies now.",
    name: "Shane Kelly",
    role: "Cardiac First Response",
    avatar: "/people/shane-kelly.png",
  },
];

/**
 * Bodies named across the Pulse 8 course pages.
 *
 * Only PHECC supplies a mark in this repo. To show the rest as logos rather
 * than wordmarks, drop the files in /public/brand/accreditations/ and set
 * `logo` here. Anything without a `logo` renders as a plain wordmark.
 */
export type Accreditation = { name: string; note?: string; logo?: string };

export const accreditations: Accreditation[] = [
  {
    name: "PHECC",
    note: "Approved Training Institute since 2010",
    logo: "/brand/phecc.png",
  },
  // The HSA recognises the PHECC FAR standard, it does not accredit Pulse 8, so
  // this one stays a wordmark on purpose. See the note in
  // public/brand/accreditations/README.md before giving it a badge.
  { name: "HSA recognised" },
  // Licensed marks, taken from each body's own site rather than a logo
  // aggregator. Swap for the provider-portal artwork when Pulse 8 supplies it,
  // and read public/brand/accreditations/README.md first.
  { name: "CPD Certified", logo: "/brand/accreditations/cpd.png" },
  { name: "IIRSM", logo: "/brand/accreditations/iirsm.png" },
  { name: "IOSH", logo: "/brand/accreditations/iosh.png" },
  { name: "Gatehouse Awards", logo: "/brand/accreditations/gatehouse-awards.png" },
];

export type Client = { name: string; logo: string };

export const clients: Client[] = [
  { name: "Educate Together", logo: "/clients/educate-together.png" },
  { name: "Gymnastics Ireland", logo: "/clients/gymnastics-ireland.png" },
  { name: "Rehab Group", logo: "/clients/rehab-group.png" },
  { name: "Munster Technological University", logo: "/clients/mtu.png" },
  { name: "Four Seasons Hotel", logo: "/clients/four-seasons.png" },
  { name: "City of Dublin ETB", logo: "/clients/cdetb.png" },
  { name: "National Learning Network", logo: "/clients/national-learning-network.png" },
  { name: "Clontarf Hockey Club", logo: "/clients/clontarf-hockey.png" },
  { name: "Firhouse Community College", logo: "/clients/firhouse-college.png" },
  { name: "Henry J Lyons", logo: "/clients/henry-j-lyons.png" },
  { name: "The Goat", logo: "/clients/the-goat.png" },
  { name: "The Bank", logo: "/clients/the-bank.png" },
  { name: "Fitzsimons", logo: "/clients/fitzsimons.png" },
];

export const supplies = [
  {
    name: "Defibrillators",
    description: "Semi-automatic AEDs, cabinets, pads and batteries.",
    href: "https://pulse8.ie/defibrillators/",
  },
  {
    name: "First aid supplies",
    description: "Workplace, school and montessori kits, restocked to spec.",
    href: "https://pulse8.ie/first-aid-supplies/",
  },
  {
    name: "Signage and bags",
    description: "AED signage, response bags and wall-mounted cabinets.",
    href: "https://pulse8.ie/aed-bags-signs/",
  },
];

export const contact = {
  email: "info@pulse8.ie",
  phone: "01 513 0073",
  phoneHref: "tel:+35315130073",
};

export const nav = [
  { label: "Courses", href: "/#courses" },
  { label: "Sectors", href: "/#sectors" },
  { label: "How it works", href: "/#how" },
  { label: "Equipment", href: "/#equipment" },
  { label: "Contact", href: "/#contact" },
];
