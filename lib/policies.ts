/**
 * Policies, ported from pulse8.ie.
 *
 * The learner policy documents are the PDFs Pulse 8 published in January 2026,
 * now served from /public/documents. The cancellation and privacy policies are
 * word for word. The cookie policy keeps the old explanation of what cookies
 * are and what your rights are, but the list of cookies placed was generated
 * for the WordPress site (WooCommerce, Complianz, Sourcebuster), none of which
 * run here, so that part now describes what this site actually stores. Have it
 * reviewed before launch.
 *
 * A block is a paragraph (string) or a list (string[]).
 */

export type PolicyBlock = string | string[];

export type PolicySection = { heading?: string; blocks: PolicyBlock[] };

export type PolicyPage = {
  slug: "cancellation" | "privacy" | "cookies";
  title: string;
  /** one line for the policies index */
  summary: string;
  sections: PolicySection[];
};

export type PolicyDocument = {
  code: string;
  title: string;
  href: string;
  issued: string;
};

const ISSUED = "August 2025";

export const policyDocuments: PolicyDocument[] = [
  { code: "P1", title: "Teaching and Learning Policy", href: "/documents/p1-teaching-and-learning.pdf", issued: ISSUED },
  { code: "P02", title: "Diversity, Equality and Inclusion Policy", href: "/documents/p02-diversity-equality-inclusion.pdf", issued: ISSUED },
  { code: "P03", title: "Anti-Bullying and Harassment Policy", href: "/documents/p03-anti-bullying-harassment.pdf", issued: ISSUED },
  { code: "P05", title: "Complaints Policy", href: "/documents/p05-complaints.pdf", issued: ISSUED },
  { code: "P07", title: "Access, Transfer and Progression Policy", href: "/documents/p07-access-transfer-progression.pdf", issued: ISSUED },
  { code: "P09", title: "Health, Safety and Welfare Policy", href: "/documents/p09-health-safety-welfare.pdf", issued: ISSUED },
  { code: "P11", title: "Data Protection Policy", href: "/documents/p11-data-protection.pdf", issued: ISSUED },
  { code: "P17", title: "Student Support Policy", href: "/documents/p17-student-support.pdf", issued: ISSUED },
  { code: "P18", title: "Assessment Policy", href: "/documents/p18-assessment.pdf", issued: ISSUED },
  { code: "P19", title: "Quality Policy", href: "/documents/p19-quality.pdf", issued: ISSUED },
  { code: "SD41", title: "Code of Conduct", href: "/documents/sd41-code-of-conduct.pdf", issued: ISSUED },
  { code: "SD42", title: "Student Charter", href: "/documents/sd42-student-charter.pdf", issued: ISSUED },
];

export const policyPages: PolicyPage[] = [
  {
    slug: "cancellation",
    title: "Cancellation policy",
    summary: "Notice periods and fees for cancelling or changing a course booking.",
    sections: [
      {
        heading: "Course cancellation policy",
        blocks: [
          "In the event of a course cancellation, the client must notify Pulse 8 by email no later than 1 week prior to the course start date to avoid any penalties.",
          [
            "Cancellations made within 72 hours of the course start date will incur a 50% cancellation fee.",
            "Cancellations made within 24 hours or on the day of the course will incur a 100% cancellation fee.",
          ],
          "If Pulse 8 cancels a course due to unforeseen circumstances beyond our control, we will reschedule the course at a date agreed upon with the client. In such cases, a 10% discount will be applied to the full course fee.",
          "To make changes to your booking, please contact us at info@pulse8.ie.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    summary: "What personal data we collect, why, and your rights under GDPR.",
    sections: [
      {
        blocks: [
          "Pulse 8 respects your privacy and is committed to protecting any personal information you share with us. This Privacy Policy outlines how we collect, use, and safeguard your data in accordance with GDPR and Irish data protection laws.",
        ],
      },
      {
        heading: "1. What information we collect",
        blocks: [
          "We may collect and store the following types of personal data:",
          [
            "Your name, email address, and contact number",
            "Information provided when booking a course or submitting an enquiry",
            "Details you provide during training, including attendance and certification details",
            "Website usage data through cookies and analytics tools",
          ],
        ],
      },
      {
        heading: "2. How we use your information",
        blocks: [
          "We use your information to:",
          [
            "Process course bookings and respond to enquiries",
            "Provide you with course updates and relevant information",
            "Issue certificates and keep training records",
            "Improve our services and website experience",
            "Comply with legal and regulatory obligations",
          ],
          "We will never sell or share your personal information with third parties for marketing purposes.",
        ],
      },
      {
        heading: "3. Data storage and security",
        blocks: [
          "All personal data is stored securely, and we take appropriate measures to protect your information from unauthorised access, alteration, or disclosure.",
        ],
      },
      {
        heading: "4. Cookies",
        blocks: [
          "Our website uses cookies to enhance user experience and track website performance. You can control cookie settings through your browser preferences.",
        ],
      },
      {
        heading: "5. Your rights",
        blocks: [
          "Under GDPR, you have the right to:",
          [
            "Access the personal data we hold about you",
            "Request correction of inaccurate information",
            "Request deletion of your data (where legally permissible)",
            "Withdraw consent for processing at any time",
          ],
          "To exercise these rights, please contact us at info@pulse8.ie.",
        ],
      },
      {
        heading: "6. Changes to this policy",
        blocks: [
          "We may update this Privacy Policy occasionally. The most current version will always be available on our website.",
        ],
      },
      {
        heading: "7. Contact us",
        blocks: [
          "If you have any questions or concerns about this Privacy Policy or how we handle your data, please contact:",
          ["Email: info@pulse8.ie", "Phone: 087 291 6007"],
        ],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie policy",
    summary: "What this website stores in your browser and how to control it.",
    sections: [
      {
        blocks: [
          "This Cookie Policy applies to citizens and legal permanent residents of the European Economic Area and Switzerland.",
        ],
      },
      {
        heading: "1. Introduction",
        blocks: [
          "Our website, https://pulse8.ie (hereinafter: \"the website\") uses cookies and other related technologies (for convenience all technologies are referred to as \"cookies\"). In the document below we inform you about the use of cookies on our website.",
        ],
      },
      {
        heading: "2. What are cookies?",
        blocks: [
          "A cookie is a small simple file that is sent along with pages of this website and stored by your browser on the hard drive of your computer or another device. The information stored therein may be returned to our servers or to the servers of the relevant third parties during a subsequent visit.",
        ],
      },
      {
        heading: "3. What are scripts?",
        blocks: [
          "A script is a piece of program code that is used to make our website function properly and interactively. This code is executed on our server or on your device.",
        ],
      },
      {
        heading: "4. What is a web beacon?",
        blocks: [
          "A web beacon (or a pixel tag) is a small, invisible piece of text or image on a website that is used to monitor traffic on a website. In order to do this, various data about you is stored using web beacons.",
        ],
      },
      {
        heading: "5. Technical or functional storage",
        blocks: [
          "Some storage ensures that certain parts of the website work properly and that your user preferences remain known. This way, you do not need to repeatedly enter the same information when visiting our website and, for example, the items remain in your basket until you send your order. We may place this storage without your consent.",
        ],
      },
      {
        heading: "6. What this website stores",
        blocks: [
          "This website does not place statistics or marketing cookies. It keeps three small entries in your browser's own storage, all of them functional:",
          [
            "pulse8-basket (local storage): the products in your basket, kept until you send your order or empty the basket",
            "pulse8-announcement (local storage): remembers that you closed the announcement bar, so the same notice does not return",
            "pulse8-loader (session storage): skips the opening animation after your first page, cleared when you close the tab",
          ],
          "Online courses are bought on the Pulse 8 e-learning portal at videotilehost.com, which is a separate website with its own cookies.",
        ],
      },
      {
        heading: "7. Enabling, disabling and deleting cookies",
        blocks: [
          "You can use your internet browser to automatically or manually delete cookies. You can also specify that certain cookies may not be placed. Another option is to change the settings of your internet browser so that you receive a message each time a cookie is placed. For more information about these options, please refer to the instructions in the Help section of your browser.",
          "Please note that our website may not work properly if all cookies are disabled.",
        ],
      },
      {
        heading: "8. Your rights with respect to personal data",
        blocks: [
          "You have the following rights with respect to your personal data:",
          [
            "You have the right to know why your personal data is needed, what will happen to it, and how long it will be retained for.",
            "Right of access: You have the right to access your personal data that is known to us.",
            "Right to rectification: you have the right to supplement, correct, have deleted or blocked your personal data whenever you wish.",
            "If you give us your consent to process your data, you have the right to revoke that consent and to have your personal data deleted.",
            "Right to transfer your data: you have the right to request all your personal data from the controller and transfer it in its entirety to another controller.",
            "Right to object: you may object to the processing of your data. We comply with this, unless there are justified grounds for processing.",
          ],
          "To exercise these rights, please contact us. Please refer to the contact details at the bottom of this Cookie Policy. If you have a complaint about how we handle your data, we would like to hear from you, but you also have the right to submit a complaint to the supervisory authority (the Data Protection Authority).",
        ],
      },
      {
        heading: "9. Contact details",
        blocks: [
          "For questions and/or comments about our Cookie Policy and this statement, please contact us by using the following contact details:",
          ["Pulse 8, Dublin, Ireland", "Website: https://pulse8.ie", "Email: info@pulse8.ie", "Phone number: 01 513 0073"],
        ],
      },
    ],
  },
];

export function getPolicyPage(slug: PolicyPage["slug"]): PolicyPage {
  const page = policyPages.find((item) => item.slug === slug);
  if (!page) throw new Error(`Unknown policy page: ${slug}`);
  return page;
}
