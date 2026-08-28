import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  SESSION_COOKIE_OPTIONS,
  clearLoginAttempts,
  createSessionToken,
  isAdminConfigured,
  isLoginRateLimited,
  verifyPassword,
} from "@/lib/admin/auth";

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  // With no password configured the admin section does not exist, and this
  // endpoint should not reveal that it might.
  if (!isAdminConfigured()) {
    return new NextResponse(null, { status: 404 });
  }

  const key = clientKey(request);
  if (isLoginRateLimited(key)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (typeof password !== "string" || !verifyPassword(password)) {
    // Deliberately unspecific: no distinction between a wrong password and a
    // malformed one.
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  clearLoginAttempts(key);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createSessionToken(), SESSION_COOKIE_OPTIONS);
  return response;
}

/** Logout. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
