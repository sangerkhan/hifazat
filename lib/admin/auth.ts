// Holds the admin password and the session-signing secret. Neither may ever
// be bundled for the browser; this turns that mistake into a build error.
import "server-only";

import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Admin authentication.
 *
 * These screens show the names and phone numbers of people who may be in danger
 * from someone who would very much like that list, so the bar here is higher
 * than for a typical internal tool:
 *
 *  - With no ADMIN_PASSWORD set, the admin section does not exist. Every route
 *    returns 404 rather than rendering a login box. An unconfigured deploy
 *    cannot accidentally ship an open door.
 *  - The password is compared in constant time against a hash, so response
 *    timing does not leak how much of a guess was correct.
 *  - The session cookie is HMAC-signed, httpOnly and short-lived. It carries an
 *    expiry and nothing else — no name, no role, nothing worth stealing on its
 *    own.
 *  - Login attempts are rate limited.
 *
 * This is deliberately a single shared password rather than per-user accounts.
 * It suits a desk of a few people today; Supabase Auth with per-lawyer accounts
 * is the upgrade path once the network grows, and is what the audit trail in
 * verification_log will need to be meaningful.
 */

const COOKIE_NAME = "hifazat_admin";
const SESSION_HOURS = 8;

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 12);
}

/**
 * The key used to sign session cookies. Derived from the password unless one is
 * supplied, which has a useful property: changing the password immediately
 * invalidates every existing session.
 */
function signingKey(): string {
  const explicit = process.env.ADMIN_SESSION_SECRET;
  if (explicit) return explicit;
  return createHash("sha256")
    .update(`hifazat-admin-session:${process.env.ADMIN_PASSWORD ?? ""}`)
    .digest("hex");
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

/** Constant-time comparison that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function verifyPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export function createSessionToken(now = Date.now()): string {
  const expiresAt = now + SESSION_HOURS * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ exp: expiresAt })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function isValidSessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  // Signature is checked before the payload is trusted at all.
  if (!safeEqual(signature, sign(payload))) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > now;
  } catch {
    return false;
  }
}

export async function hasAdminSession(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const store = await cookies();
  return isValidSessionToken(store.get(COOKIE_NAME)?.value);
}

export const ADMIN_COOKIE = COOKIE_NAME;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  // Vercel terminates TLS, so this is always safe in production. Left off in
  // development so the cookie works over plain http on localhost.
  secure: process.env.NODE_ENV === "production",
  // Must be "/" rather than "/admin": the admin pages live under /admin but the
  // actions they call live under /api/admin, and a cookie scoped to /admin is
  // not sent to /api/admin. Scoping it narrowly broke every write from the UI
  // while leaving page loads working, which is exactly the kind of bug that
  // survives a casual click-through.
  path: "/",
  maxAge: SESSION_HOURS * 60 * 60,
};

// ---------------------------------------------------------------------------
// Login rate limiting
// ---------------------------------------------------------------------------

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, number[]>();

/**
 * Per-instance, like the referral limiter. Enough to stop casual guessing; a
 * distributed attacker would need the database-backed version, which is the
 * same upgrade the referral endpoint needs.
 */
export function isLoginRateLimited(key: string, now = Date.now()): boolean {
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(key, recent);
    return true;
  }

  recent.push(now);
  attempts.set(key, recent);

  if (attempts.size > 1000) {
    for (const [k, times] of attempts) {
      if (times.every((t) => now - t >= WINDOW_MS)) attempts.delete(k);
    }
  }

  return false;
}

/** Clears the attempt counter after a successful login. */
export function clearLoginAttempts(key: string): void {
  attempts.delete(key);
}
