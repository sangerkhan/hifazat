import { describe, expect, it } from "vitest";

/**
 * Mirrors the maskPhone in app/admin/(protected)/referrals/page.tsx.
 *
 * Masking is done on the server so the full number never reaches the browser.
 * A client-side toggle would look identical and protect nothing — the number
 * would still be one "view source" away, in the browser cache, and in any
 * screenshot of the queue.
 */
function maskPhone(phone: string | null): string {
  if (!phone) return "no number";
  if (phone.length <= 6) return "•".repeat(phone.length);
  return `${phone.slice(0, 5)}${"•".repeat(Math.max(phone.length - 7, 3))}${phone.slice(-2)}`;
}

describe("phone masking", () => {
  const real = "+923001234567";

  it("hides the subscriber digits", () => {
    const masked = maskPhone(real);
    expect(masked).not.toContain("0012345");
    expect(masked).toContain("•");
  });

  it("keeps just enough to confirm the right person on a call", () => {
    const masked = maskPhone(real);
    expect(masked.startsWith("+9230")).toBe(true);
    expect(masked.endsWith("67")).toBe(true);
  });

  it("never leaks the full number", () => {
    expect(maskPhone(real)).not.toBe(real);
    expect(maskPhone(real)).not.toContain(real.slice(5, -2));
  });

  it("handles a missing number without throwing", () => {
    expect(maskPhone(null)).toBe("no number");
    expect(maskPhone("")).toBe("no number");
  });

  it("masks a short number entirely rather than revealing most of it", () => {
    expect(maskPhone("12345")).toBe("•••••");
    expect(maskPhone("1234")).not.toContain("1");
  });

  it("preserves length so the masking is not misleading about the number", () => {
    expect(maskPhone(real)).toHaveLength(real.length);
  });
});
