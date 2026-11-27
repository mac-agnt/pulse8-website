"use client";

import { useCallback, useEffect, useState } from "react";
import { EnvelopeSimple, UserPlus } from "@phosphor-icons/react";
import type { StaffRole, StaffSummary } from "@/lib/admin/types";
import { Card, Field, Select, TextInput, Toggle } from "@/components/admin/Field";
import { AdminButton, Badge, Notice } from "@/components/admin/ui";
import { adminApi, formatWhen } from "@/components/admin/api";

const ROLE_HINT: Record<StaffRole, string> = {
  owner: "Everything, including Finance (payments and revenue) and adding or removing logins.",
  staff: "Prices, dates, courses and site copy. Can't see Finance or any payment amounts, or manage logins.",
};

function AddPerson({ onDone }: { onDone: (message: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const [sendLink, setSendLink] = useState(true);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const result = await adminApi<{ linkSent?: boolean }>("/api/admin/staff", {
            method: "POST",
            json: { name, email, role, sendLink, password: sendLink ? "" : password },
          });
          onDone(
            sendLink
              ? result.linkSent
                ? `${name} has a login. We emailed them a sign-in link.`
                : `${name} has a login, but the email didn't send. Use “Email sign-in link” below once email is working, or set them a password.`
              : `${name} has a login. Tell them their password yourself (not by email), and ask them to change it under “Your account”.`,
          );
        } catch (cause) {
          setError((cause as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Name" htmlFor="staff-name">
        <TextInput id="staff-name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Email" htmlFor="staff-email">
        <TextInput id="staff-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      <Field label="Role" htmlFor="staff-role" hint={ROLE_HINT[role]}>
        <Select id="staff-role" value={role} onChange={(event) => setRole(event.target.value as StaffRole)}>
          <option value="staff">Staff</option>
          <option value="owner">Owner</option>
        </Select>
      </Field>
      <div className="flex flex-col gap-3">
        <Toggle checked={sendLink} onChange={setSendLink} label="Email them a sign-in link" />
        {!sendLink ? (
          <Field label="Starting password" htmlFor="staff-password" hint="At least 10 characters.">
            <TextInput id="staff-password" type="text" autoComplete="off" minLength={10} required value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
        ) : null}
      </div>
      {error ? <Notice tone="error" className="sm:col-span-2">{error}</Notice> : null}
      <div className="sm:col-span-2">
        <AdminButton type="submit" variant="primary" disabled={busy} icon={<UserPlus size={16} />}>
          {busy ? "Adding…" : "Add login"}
        </AdminButton>
      </div>
    </form>
  );
}

/** Logins. Owners only: add people, change roles, switch someone off, email a sign-in link. */
export function StaffPanel({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<StaffSummary[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fail = useCallback((cause: Error) => setError(cause.message), []);
  const load = useCallback(() => adminApi<StaffSummary[]>("/api/admin/staff").then(setUsers, fail), [fail]);
  useEffect(() => {
    adminApi<StaffSummary[]>("/api/admin/staff").then(setUsers, fail);
  }, [fail]);

  const act = async (id: string, work: () => Promise<unknown>, done: string) => {
    setBusy(id);
    setError(null);
    setNotice(null);
    try {
      await work();
      await load();
      setNotice(done);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}

      {adding ? (
        <Card title="Add a login" description="Each person gets their own login, so the activity log shows who changed what.">
          <AddPerson
            onDone={(message) => {
              setAdding(false);
              setNotice(message);
              void load();
            }}
          />
        </Card>
      ) : (
        <div>
          <AdminButton variant="primary" icon={<UserPlus size={16} />} onClick={() => setAdding(true)}>
            Add a login
          </AdminButton>
        </div>
      )}

      <Card title="Logins">
        {!users ? (
          <p className="text-[0.875rem] text-ink-faint">Loading…</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {users.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="flex items-center gap-2 text-[0.875rem] font-medium text-ink">
                    {user.name}
                    {user.id === currentUserId ? <Badge tone="muted">you</Badge> : null}
                    {!user.active ? <Badge tone="warn">Switched off</Badge> : null}
                  </p>
                  <p className="truncate text-[0.75rem] text-ink-faint">
                    {user.email} · {user.hasPassword ? "password" : "email links only"}
                    {user.lastLoginAt ? ` · last in ${formatWhen(user.lastLoginAt)}` : " · not signed in yet"}
                  </p>
                </div>
                <Select
                  aria-label={`${user.name}'s role`}
                  value={user.role}
                  disabled={busy === user.id}
                  className="w-32 py-1.5 text-[0.8125rem]"
                  onChange={(event) =>
                    void act(
                      user.id,
                      () => adminApi(`/api/admin/staff/${user.id}`, { method: "PATCH", json: { role: event.target.value } }),
                      `${user.name} is now ${event.target.value === "owner" ? "an owner" : "staff"}.`,
                    )
                  }
                >
                  <option value="staff">Staff</option>
                  <option value="owner">Owner</option>
                </Select>
                <div className="flex gap-1">
                  {user.active ? (
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      icon={<EnvelopeSimple size={14} />}
                      disabled={busy === user.id}
                      onClick={() =>
                        void act(
                          user.id,
                          () => adminApi(`/api/admin/staff/${user.id}/link`, { method: "POST", json: {} }),
                          `Sign-in link emailed to ${user.name}.`,
                        )
                      }
                    >
                      Email sign-in link
                    </AdminButton>
                  ) : null}
                  {user.id !== currentUserId ? (
                    <AdminButton
                      size="sm"
                      variant={user.active ? "danger" : "secondary"}
                      disabled={busy === user.id}
                      onClick={() => {
                        if (user.active && !window.confirm(`Switch off ${user.name}'s login? They're signed out straight away.`)) return;
                        void act(
                          user.id,
                          () => adminApi(`/api/admin/staff/${user.id}`, { method: "PATCH", json: { active: !user.active } }),
                          user.active ? `${user.name} can no longer sign in.` : `${user.name} can sign in again.`,
                        );
                      }}
                    >
                      {user.active ? "Switch off" : "Switch on"}
                    </AdminButton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-[0.75rem] text-ink-faint">
        Forgotten password: press “Email sign-in link” for that person; once in, they set a new one under “Your account”.
      </p>
    </div>
  );
}
