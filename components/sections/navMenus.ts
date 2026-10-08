import type { ElementType } from "react";
import {
  Archive,
  Baby,
  BatteryFull,
  Book,
  Backpack,
  Briefcase,
  CalendarBlank,
  FirstAidKit,
  GraduationCap,
  HandGrabbing,
  Heartbeat,
  Info,
  Laptop,
  Lightning,
  ListChecks,
  Scroll,
  Signpost,
  SignIn,
} from "@phosphor-icons/react";

/**
 * Menus for the desktop navigation. Shop entries mirror the categories in
 * lib/shop.ts, written out here so the header does not pull the whole product
 * catalogue into the client bundle.
 */
export type NavItem = {
  id: number;
  label: string;
  href: string;
  subMenus?: {
    title: string;
    items: {
      label: string;
      description: string;
      href: string;
      icon: ElementType;
      external?: boolean;
    }[];
  }[];
};

export const navItems: NavItem[] = [
  {
    id: 1,
    label: "Courses",
    href: "/courses",
    subMenus: [
      {
        title: "Train with us",
        items: [
          {
            label: "All courses",
            description: "Classroom, blended and online",
            href: "/courses",
            icon: ListChecks,
          },
          {
            label: "Blended learning",
            description: "First Aid Response, theory online",
            href: "/courses/first-aid-response-blended",
            icon: Laptop,
          },
          {
            label: "Upcoming dates",
            description: "Book a place on the next course",
            href: "/book",
            icon: CalendarBlank,
          },
        ],
      },
      {
        title: "Already enrolled",
        items: [
          {
            label: "Course login",
            description: "Open your e-learning portal",
            href: "https://www.p8courses.com/",
            icon: SignIn,
            external: true,
          },
          {
            label: "Online courses",
            description: "Start at your own pace today",
            href: "/courses#online",
            icon: GraduationCap,
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "Shop",
    href: "/shop",
    subMenus: [
      {
        title: "Defibrillators",
        items: [
          { label: "Defibrillators", description: "AEDs for workplaces and clubs", href: "/shop/defibrillators", icon: Heartbeat },
          { label: "Pads", description: "Adult and paediatric pads", href: "/shop/pads", icon: Lightning },
          { label: "Batteries", description: "AED batteries and Pad-Paks", href: "/shop/batteries", icon: BatteryFull },
          { label: "Cabinets", description: "Indoor and outdoor, alarmed", href: "/shop/defibrillator-cabinets", icon: Archive },
          { label: "Bags and signs", description: "Signage, hooks and cases", href: "/shop/aed-bags-signs", icon: Signpost },
        ],
      },
      {
        title: "First aid",
        items: [
          { label: "First aid supplies", description: "Dressings, eye wash, refills", href: "/shop/first-aid-supplies", icon: FirstAidKit },
          { label: "Wearables", description: "Gloves and CPR masks", href: "/shop/wearables", icon: HandGrabbing },
          { label: "Workplace", description: "First aid points and vehicle kits", href: "/shop/workplace", icon: Briefcase },
          { label: "Schools", description: "Kits sized for school first aid", href: "/shop/schools", icon: Backpack },
          { label: "Montessori and childcare", description: "Sized by children in your care", href: "/shop/montessori-childcare", icon: Baby },
          { label: "Books", description: "Course manuals and handbooks", href: "/shop/books", icon: Book },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "About",
    href: "/about",
    subMenus: [
      {
        title: "Pulse 8",
        items: [
          {
            label: "About Pulse 8",
            description: "Instructors, PHECC approval, how we work",
            href: "/about",
            icon: Info,
          },
          {
            label: "Policies",
            description: "Learner policies, privacy and cancellations",
            href: "/policies",
            icon: Scroll,
          },
        ],
      },
    ],
  },
  { id: 4, label: "FAQs", href: "/#faq" },
  { id: 5, label: "Contact", href: "/contact" },
];
