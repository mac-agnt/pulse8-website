import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Loader } from "@/components/ui/Loader";
import { MotionProvider } from "@/components/ui/MotionProvider";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pulse8.ie"),
  title: "Pulse 8 | First aid and safety training in Ireland",
  description:
    "PHECC Approved Training Institute delivering first aid, fire safety and manual handling training across Ireland, in your workplace or online.",
  icons: { icon: "/brand/favicon.png" },
  openGraph: {
    title: "Pulse 8 | First aid and safety training in Ireland",
    description:
      "PHECC Approved Training Institute delivering first aid, fire safety and manual handling training across Ireland.",
    url: "https://pulse8.ie",
    siteName: "Pulse 8",
    locale: "en_IE",
    type: "website",
  },
};

// Runs before paint so the loader never flashes in when it should be skipped.
// The announcement bar handles its own dismissal, next to its own markup.
const bootInit = `
(function () {
  var root = document.documentElement;

  try {
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var deepLink = window.location.hash.length > 1;
    var seen = sessionStorage.getItem("pulse8-loader") === "1";
    if (reduced || deepLink || seen) return;
    sessionStorage.setItem("pulse8-loader", "1");
    root.setAttribute("data-loader", "run");
    // The overlay has already faded by now; this drops it out of the layer stack.
    setTimeout(function () {
      root.setAttribute("data-loader", "done");
    }, 1800);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-IE"
      data-announcement="open"
      className={`${lexend.variable} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <Script
          id="boot-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: bootInit }}
        />
        <Loader />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
