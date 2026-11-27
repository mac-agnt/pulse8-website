"use client";

/**
 * Calls an /api/admin route and returns its JSON, or throws an Error carrying
 * the route's own plain-English message. A 401 means the session ended: the
 * browser goes back to the sign-in page.
 */
export async function adminApi<T = unknown>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const response = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  if (response.status === 401) {
    window.location.assign("/admin/login");
    throw new Error("Please sign in again.");
  }
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(data?.error ?? `Something went wrong (${response.status}). Try again.`);
  return data as T;
}

export const formatWhen = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
