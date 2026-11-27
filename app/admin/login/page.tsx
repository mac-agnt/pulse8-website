import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { adminAvailable, currentStaff, setupOpen } from "@/lib/admin/auth.server";

export const metadata: Metadata = {
  title: "Sign in | Pulse 8 admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // A deployment with no logins and no bootstrap password has no admin at all.
  if (!(await adminAvailable())) notFound();
  if (await currentStaff().catch(() => null)) redirect("/admin");
  const open = await setupOpen().catch(() => false);
  return <LoginForm setupOpen={open} needsSetupPassword={Boolean(process.env.ADMIN_PASSWORD) || process.env.NODE_ENV === "production"} />;
}
