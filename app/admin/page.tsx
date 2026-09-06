import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { readContent } from "@/lib/content.server";

export const metadata: Metadata = {
  title: "Pulse 8 admin",
  // A working CMS with no login on it has no business in a search index.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  return <AdminShell initialContent={await readContent()} />;
}
