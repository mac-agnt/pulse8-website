import type { Metadata } from "next";
import { LinkSignIn } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Sign in | Pulse 8 admin",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AdminLinkPage() {
  return <LinkSignIn />;
}
