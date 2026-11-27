"use client";

import { useState } from "react";
import { SignOut } from "@phosphor-icons/react";
import type { StaffSummary } from "@/lib/admin/types";
import { Card, Field, TextInput } from "@/components/admin/Field";
import { AdminButton, Notice } from "@/components/admin/ui";
import { adminApi } from "@/components/admin/api";

export async function signOut() {
  await fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => undefined);
  window.location.assign("/admin/login");
}

/** Your own login: set or change your password, sign out. */
export function AccountPanel({ user }: { user: StaffSummary }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [hasPassword, setHasPassword] = useState(user.hasPassword);

  return (
    <div className="flex flex-col gap-5">
      <Card title={user.name} description={`${user.email} · ${user.role === "owner" ? "Owner" : "Staff"}`}>
        <AdminButton icon={<SignOut size={15} />} onClick={() => void signOut()}>
          Sign out
        </AdminButton>
      </Card>

      <Card
        title={hasPassword ? "Change your password" : "Set a password"}
        description={
          hasPassword
            ? "Other browsers signed in as you are signed out when you change it."
            : "You sign in with email links today. Set a password to sign in without waiting for an email."
        }
      >
        <form
          className="grid max-w-md gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setDone(false);
            if (password !== repeat) {
              setError("The two new passwords don't match.");
              return;
            }
            setBusy(true);
            try {
              await adminApi("/api/admin/account", { method: "POST", json: { current, password } });
              setDone(true);
              setHasPassword(true);
              setCurrent("");
              setPassword("");
              setRepeat("");
            } catch (cause) {
              setError((cause as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {hasPassword ? (
            <Field label="Current password" htmlFor="account-current">
              <TextInput id="account-current" type="password" autoComplete="current-password" required value={current} onChange={(event) => setCurrent(event.target.value)} />
            </Field>
          ) : null}
          <Field label="New password" htmlFor="account-new" hint="At least 10 characters. A short sentence is easy to remember.">
            <TextInput id="account-new" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Field label="New password again" htmlFor="account-repeat">
            <TextInput id="account-repeat" type="password" autoComplete="new-password" minLength={10} required value={repeat} onChange={(event) => setRepeat(event.target.value)} />
          </Field>
          {error ? <Notice tone="error">{error}</Notice> : null}
          {done ? <Notice tone="success">Password saved.</Notice> : null}
          <div>
            <AdminButton type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : "Save password"}
            </AdminButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
