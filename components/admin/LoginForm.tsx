"use client";

import { useState } from "react";
import { EnvelopeSimple, Key, ShieldCheck } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Field, TextInput } from "@/components/admin/Field";
import { AdminButton, Notice } from "@/components/admin/ui";

type Mode = "password" | "link" | "setup";

async function post(url: string, json: unknown): Promise<string | null> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });
  if (response.ok) return null;
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "Something went wrong. Try again.";
}

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[10px] bg-navy text-[14px] font-semibold text-on-navy">P8</span>
          <span>
            <span className="block text-[0.9375rem] font-semibold text-ink">Pulse 8 admin</span>
            <span className="block text-[0.75rem] text-ink-faint">Prices, dates and the website</span>
          </span>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[0_1px_2px_oklch(0%_0_0/0.04)]">
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">{title}</h1>
          <p className="mt-1 mb-5 text-[0.875rem] text-ink-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  );
}

/** Sign in with a password or an emailed link; or, before anyone exists, create the first owner. */
export function LoginForm({ setupOpen, needsSetupPassword }: { setupOpen: boolean; needsSetupPassword: boolean }) {
  const [mode, setMode] = useState<Mode>(setupOpen ? "setup" : "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const problem =
      mode === "password"
        ? await post("/api/admin/auth/login", { email, password })
        : mode === "link"
          ? await post("/api/admin/auth/link", { email })
          : await post("/api/admin/auth/setup", { setupPassword, name, email, password });
    setBusy(false);
    if (problem) {
      setError(problem);
      return;
    }
    if (mode === "link") setLinkSent(true);
    else window.location.assign("/admin");
  };

  if (mode === "setup") {
    return (
      <AuthFrame title="Create the owner login" subtitle="No one has a login yet. The first person in becomes the owner and adds everyone else.">
        <form className="grid gap-4" onSubmit={submit}>
          {needsSetupPassword ? (
            <Field label="Set-up password" htmlFor="setup-key" hint="The ADMIN_PASSWORD value from Vercel. Only works until the owner exists.">
              <TextInput id="setup-key" type="password" required value={setupPassword} onChange={(event) => setSetupPassword(event.target.value)} />
            </Field>
          ) : null}
          <Field label="Your name" htmlFor="setup-name">
            <TextInput id="setup-name" required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Your email" htmlFor="setup-email">
            <TextInput id="setup-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Choose a password" htmlFor="setup-password" hint="At least 10 characters.">
            <TextInput id="setup-password" type="password" minLength={10} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <AdminButton type="submit" variant="primary" disabled={busy} icon={<ShieldCheck size={16} />}>
            {busy ? "Creating…" : "Create owner login"}
          </AdminButton>
        </form>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Sign in" subtitle="Use your own Pulse 8 admin login.">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-[var(--radius-control)] border border-border bg-bg p-1" role="tablist">
        {(
          [
            ["password", "Password", Key],
            ["link", "Email me a link", EnvelopeSimple],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => {
              setMode(id);
              setError(null);
              setLinkSent(false);
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-[7px] px-2 py-1.5 text-[0.8125rem] font-medium transition-colors",
              mode === id ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {linkSent ? (
        <Notice tone="success">
          If {email} has a login, a sign-in link is on its way. It works once, for 15 minutes. Check spam if it isn&apos;t there in a minute.
        </Notice>
      ) : (
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Email" htmlFor="login-email">
            <TextInput id="login-email" type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          {mode === "password" ? (
            <Field label="Password" htmlFor="login-password">
              <TextInput id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
          ) : null}
          {error ? <Notice tone="error">{error}</Notice> : null}
          <AdminButton type="submit" variant="primary" disabled={busy}>
            {busy ? "One moment…" : mode === "password" ? "Sign in" : "Email me a sign-in link"}
          </AdminButton>
          {mode === "password" ? (
            <p className="text-[0.75rem] text-ink-faint">Forgotten your password? Use “Email me a link”, then set a new one under Your account.</p>
          ) : null}
        </form>
      )}
    </AuthFrame>
  );
}

/** The page an emailed link opens. Only the button spends the link, so mail scanners can't. */
export function LinkSignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <AuthFrame title="Finish signing in" subtitle="Press the button to sign in to the Pulse 8 admin on this device.">
      <div className="grid gap-4">
        {error ? <Notice tone="error">{error}</Notice> : null}
        <AdminButton
          variant="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const token = window.location.hash.slice(1);
            const problem = await post("/api/admin/auth/link/verify", { token });
            if (problem) {
              setError(problem);
              setBusy(false);
              return;
            }
            window.history.replaceState(null, "", "/admin/login/link");
            window.location.assign("/admin");
          }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </AdminButton>
        <a href="/admin/login" className="text-center text-[0.8125rem] text-ink-muted hover:text-ink">
          Ask for a new link
        </a>
      </div>
    </AuthFrame>
  );
}
