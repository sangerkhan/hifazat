import { afterEach, beforeEach, describe, expect, it } from "vitest";

const PASSWORD = "a-sufficiently-long-password";

// The module reads process.env at call time, so it is imported once and the
// environment is swapped around it.
let auth: typeof import("../admin/auth");

beforeEach(async () => {
  process.env.ADMIN_PASSWORD = PASSWORD;
  delete process.env.ADMIN_SESSION_SECRET;
  auth = await import("../admin/auth");
});

afterEach(() => {
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_SESSION_SECRET;
});

describe("configuration", () => {
  it("is configured with a long enough password", () => {
    expect(auth.isAdminConfigured()).toBe(true);
  });

  // The property that keeps an unconfigured deploy from shipping an open door.
  it("is not configured when no password is set", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(auth.isAdminConfigured()).toBe(false);
  });

  it("refuses a trivially short password rather than accepting it", () => {
    process.env.ADMIN_PASSWORD = "short";
    expect(auth.isAdminConfigured()).toBe(false);
  });
});

describe("password check", () => {
  it("accepts the correct password", () => {
    expect(auth.verifyPassword(PASSWORD)).toBe(true);
  });

  it.each(["wrong", "", PASSWORD + "x", PASSWORD.slice(0, -1), PASSWORD.toUpperCase()])(
    "rejects %j",
    (candidate) => {
      expect(auth.verifyPassword(candidate)).toBe(false);
    },
  );

  it("rejects everything when no password is configured", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(auth.verifyPassword("anything")).toBe(false);
    expect(auth.verifyPassword("")).toBe(false);
  });
});

describe("session tokens", () => {
  it("accepts a token it just issued", () => {
    expect(auth.isValidSessionToken(auth.createSessionToken())).toBe(true);
  });

  it("rejects a missing or malformed token", () => {
    expect(auth.isValidSessionToken(undefined)).toBe(false);
    expect(auth.isValidSessionToken("")).toBe(false);
    expect(auth.isValidSessionToken("nonsense")).toBe(false);
    expect(auth.isValidSessionToken("no-dot-separator")).toBe(false);
  });

  // The forgery case: a valid-looking payload with a signature that was not
  // produced by our key.
  it("rejects a payload signed with the wrong key", () => {
    const forgedPayload = Buffer.from(
      JSON.stringify({ exp: Date.now() + 3_600_000 }),
    ).toString("base64url");
    expect(auth.isValidSessionToken(`${forgedPayload}.deadbeef`)).toBe(false);
  });

  it("rejects a token whose payload was tampered with after signing", () => {
    const token = auth.createSessionToken();
    const [, signature] = token.split(".");
    const tampered = Buffer.from(
      JSON.stringify({ exp: Date.now() + 10 * 365 * 24 * 3600_000 }),
    ).toString("base64url");
    expect(auth.isValidSessionToken(`${tampered}.${signature}`)).toBe(false);
  });

  it("rejects an expired token", () => {
    const issued = Date.now() - 9 * 60 * 60 * 1000;
    expect(auth.isValidSessionToken(auth.createSessionToken(issued))).toBe(false);
  });

  it("accepts a token that has not yet expired", () => {
    const issued = Date.now() - 7 * 60 * 60 * 1000;
    expect(auth.isValidSessionToken(auth.createSessionToken(issued))).toBe(true);
  });
});

describe("session cookie options", () => {
  // Regression: the cookie was originally scoped to path "/admin". Pages under
  // /admin still loaded, so a click-through looked fine — but every write goes
  // to /api/admin/*, which that path does not cover, so no action could ever
  // save. The scope has to span both trees.
  it("is scoped to a path that covers both /admin and /api/admin", () => {
    const { path } = auth.SESSION_COOKIE_OPTIONS;
    expect(path).toBe("/");
    expect("/admin/resources".startsWith(path)).toBe(true);
    expect("/api/admin/resources".startsWith(path)).toBe(true);
  });

  it("is httpOnly and same-site, so script and cross-site requests cannot use it", () => {
    expect(auth.SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(auth.SESSION_COOKIE_OPTIONS.sameSite).toBe("lax");
  });

  it("expires rather than persisting indefinitely", () => {
    expect(auth.SESSION_COOKIE_OPTIONS.maxAge).toBeGreaterThan(0);
    expect(auth.SESSION_COOKIE_OPTIONS.maxAge).toBeLessThanOrEqual(12 * 60 * 60);
  });
});

describe("login rate limiting", () => {
  it("allows a reasonable number of attempts then blocks", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 10; i++) {
      expect(auth.isLoginRateLimited(key)).toBe(false);
    }
    expect(auth.isLoginRateLimited(key)).toBe(true);
  });

  it("tracks each client separately", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    for (let i = 0; i < 10; i++) auth.isLoginRateLimited(a);
    expect(auth.isLoginRateLimited(a)).toBe(true);
    expect(auth.isLoginRateLimited(b)).toBe(false);
  });

  it("forgets attempts after a successful login", () => {
    const key = `c-${Math.random()}`;
    for (let i = 0; i < 10; i++) auth.isLoginRateLimited(key);
    expect(auth.isLoginRateLimited(key)).toBe(true);
    auth.clearLoginAttempts(key);
    expect(auth.isLoginRateLimited(key)).toBe(false);
  });
});
