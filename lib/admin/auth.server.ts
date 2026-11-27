import "server-only";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminStore } from "@/lib/admin/store.server";
import type { Actor, StaffRole, StaffUser } from "@/lib/admin/types";
import { clientKey } from "@/lib/validate.server";

/**
 * Staff sign-in for /admin.
 *
 * Each person has their own login: email and password, or a one-time link
 * emailed to them. A sign-in sets an httpOnly cookie holding a random token;
 * only its sha256 is stored, so the sessions table can't be replayed. Sessions
 * last 30 days at most and end after 7 days unused. Passwords are hashed with
 * scrypt. Failed sign-ins are counted per email and per address in the store,
 * so the limit holds across every server instance.
 *
 * ADMIN_PASSWORD is only a bootstrap: while there is no active owner, it lets
 * the first person in create the owner account. After that it does nothing.
 *
 * Nothing here logs an email address, a password or a token.
 */

export const SESSION_COOKIE = "p8_staff";
const SESSION_DAYS = 30;
const IDLE_DAYS = 7;
const TOUCH_AFTER_MS = 60 * 60 * 1000;
export const LINK_MINUTES = 15;
export const MIN_PASSWORD = 10;

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number, options: object) => Promise<Buffer>;
const SCRYPT = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scryptAsync(password, Buffer.from(salt, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Hashed so a sign-in for a wrong email costs the same as a right one. */
const DUMMY_HASH = hashPassword(randomBytes(12).toString("hex"));

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD) {
    return `Use at least ${MIN_PASSWORD} characters.`;
  }
  if (password.length > 200) return "That password is too long.";
  return null;
}

export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/* Rate limits ------------------------------------------------------------ */

type Limit = { key: string; max: number; minutes: number };

/** True when any of the limits is used up. Keys are hashed: no emails or addresses stored. */
export async function limited(limits: Limit[]): Promise<boolean> {
  const store = adminStore();
  for (const limit of limits) {
    const since = new Date(Date.now() - limit.minutes * 60_000).toISOString();
    if ((await store.countAttempts(sha256(limit.key), since)) >= limit.max) return true;
  }
  return false;
}

export async function recordAttempt(...keys: string[]): Promise<void> {
  const at = new Date().toISOString();
  for (const key of keys) await adminStore().addAttempt(sha256(key), at);
}

export async function clearAttempts(key: string): Promise<void> {
  await adminStore().clearAttempts(sha256(key));
}

export const ipOf = (request: Request) => clientKey(request);

/* Sessions --------------------------------------------------------------- */

export type CurrentStaff = { user: StaffUser; tokenHash: string };

/** Starts a session and puts its cookie on `response`. */
export async function startSession(response: NextResponse, user: StaffUser): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  const store = adminStore();
  await store.createSession({
    tokenHash: sha256(token),
    userId: user.id,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    lastSeenAt: now.toISOString(),
  });
  await store.putUser({ ...user, lastLoginAt: now.toISOString() });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Who is signed in on this request, or null. Server components and route handlers. */
export async function currentStaff(): Promise<CurrentStaff | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const tokenHash = sha256(token);
  const store = adminStore();
  const session = await store.sessionByHash(tokenHash);
  if (!session) return null;
  const now = Date.now();
  if (Date.parse(session.expiresAt) <= now || Date.parse(session.lastSeenAt) + IDLE_DAYS * 86_400_000 <= now) {
    await store.deleteSession(tokenHash);
    return null;
  }
  const user = await store.userById(session.userId);
  if (!user || !user.active) return null;
  if (now - Date.parse(session.lastSeenAt) > TOUCH_AFTER_MS) {
    await store.touchSession(tokenHash, new Date(now).toISOString());
  }
  return { user, tokenHash };
}

export const actorOf = (user: StaffUser): Actor => ({ id: user.id, name: user.name });

/**
 * A change sent from somewhere other than this site is refused. The cookie is
 * SameSite=Lax already; this is the second lock on the door.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.method === "GET" || request.method === "HEAD";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * For /api/admin routes: the signed-in staff member, or the response to send
 * instead (401 not signed in, 403 wrong role or cross-site).
 */
export async function guard(
  request: Request,
  role: StaffRole = "staff",
): Promise<{ staff: CurrentStaff; response?: undefined } | { staff?: undefined; response: NextResponse }> {
  if (!sameOrigin(request)) {
    return { response: NextResponse.json({ error: "Refused: not sent from this site." }, { status: 403 }) };
  }
  let staff: CurrentStaff | null;
  try {
    staff = await currentStaff();
  } catch (error) {
    console.error("[admin-auth] store unavailable:", (error as Error).message);
    return { response: NextResponse.json({ error: "The admin database can't be reached right now." }, { status: 503 }) };
  }
  if (!staff) {
    return { response: NextResponse.json({ error: "Please sign in again." }, { status: 401 }) };
  }
  if (role === "owner" && staff.user.role !== "owner") {
    return { response: NextResponse.json({ error: "Only an owner can do that." }, { status: 403 }) };
  }
  return { staff };
}

/* First owner ------------------------------------------------------------ */

/**
 * Whether the first-owner form may be shown: no active owner yet, and either
 * ADMIN_PASSWORD is set, or this is development (where anyone running the
 * site already controls it).
 */
export async function setupOpen(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD && process.env.NODE_ENV === "production") return false;
  return (await adminStore().countActiveOwners()) === 0;
}

export function setupPasswordMatches(supplied: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return process.env.NODE_ENV !== "production";
  if (typeof supplied !== "string") return false;
  const a = Buffer.from(sha256(supplied));
  const b = Buffer.from(sha256(expected));
  return timingSafeEqual(a, b);
}

/** Whether /admin exists at all on this deployment: a staff login, or the bootstrap password. */
export async function adminAvailable(): Promise<boolean> {
  if (process.env.ADMIN_PASSWORD || process.env.NODE_ENV !== "production") return true;
  try {
    return (await adminStore().countUsers()) > 0;
  } catch {
    return false;
  }
}

/* Users ------------------------------------------------------------------ */

export function newUser(input: { email: string; name: string; role: StaffRole; passwordHash: string | null }): StaffUser {
  return { id: randomUUID(), active: true, createdAt: new Date().toISOString(), ...input };
}

/** Checks a password sign-in. Same time taken whether or not the email exists. */
export async function checkPassword(email: string, password: string): Promise<StaffUser | null> {
  const user = await adminStore().userByEmail(email);
  const ok = await verifyPassword(password, user?.passwordHash ?? (await DUMMY_HASH));
  return ok && user && user.active ? user : null;
}

/** A one-time sign-in link token for this user; returns the raw token for the email. */
export async function issueLoginToken(user: StaffUser): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + LINK_MINUTES * 60_000).toISOString();
  await adminStore().putLoginToken(sha256(token), user.id, expires);
  return token;
}

export async function redeemLoginToken(token: unknown): Promise<StaffUser | null> {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  const userId = await adminStore().takeLoginToken(sha256(token), new Date().toISOString());
  if (!userId) return null;
  const user = await adminStore().userById(userId);
  return user && user.active ? user : null;
}
