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
  Laptop,
  Lightning,
  ListChecks,
  Pill,
  Signpost,
  SignIn,
  Syringe,
} from "@phosphor-icons/react";
import { joinCourseUrl } from "@/lib/site-config";

/**
 * Menus for the desktop navigation. Shop entries mirror the categories in
 * lib/shop.ts, written out here so the header does not pull the whole product
 * catalogue into the client bundle.
 */
export type NavItem = {
  id: number;
  label: string;
  href: string;
  /** "outlined" draws the item as a secondary action (Shop) */
  variant?: "outlined";
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
            description: "In-person, blended and online",
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
            label: "Course dates",
            description: "Upcoming dates by course and format",
            href: "/book",
            icon: CalendarBlank,
          },
        ],
      },
      {
        title: "Medication",
        items: [
          {
            label: "Buccal Midazolam Training",
            description: "Supporting a seizure care plan",
            href: "/courses/buccal-midazolam",
            icon: Pill,
          },
          {
            label: "EpiPen Training",
            description: "Responding to severe allergic reactions",
            href: "/courses/epipen",
            icon: Syringe,
          },
        ],
      },
      {
        title: "Already enrolled",
        items: [
          {
            // The p8courses page takes a course ID from the joining email. It is
            // not a learner sign-in, so it is labelled for what it does.
            label: "Join a course",
            description: "Enter the course ID from your email",
            href: joinCourseUrl,
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
  { id: 3, label: "About", href: "/about" },
  { id: 4, label: "Policies", href: "/policies" },
  { id: 5, label: "FAQs", href: "/#faq" },
  { id: 6, label: "Contact", href: "/contact" },
  {
    id: 2,
    label: "Shop",
    href: "/shop",
    variant: "outlined",
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
];
