import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { currentStaff } from "@/lib/admin/auth.server";
import { adminStore } from "@/lib/admin/store.server";
import { summarise } from "@/lib/admin/types";
import { composeContent } from "@/lib/content.server";

export const metadata: Metadata = {
  title: "Pulse 8 admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/admin/login");
  const docs = await adminStore().readDocs();
  return (
    <AdminShell
      user={summarise(staff.user)}
      initialContent={composeContent(docs)}
      initialVersions={{ copy: docs.copy.version, courses: docs.courses.version }}
    />
  );
}
