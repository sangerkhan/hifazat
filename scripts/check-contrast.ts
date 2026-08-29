/**
 * Checks the semantic colour tokens against WCAG contrast, reading the values
 * that actually ship rather than a copy of them.
 *
 * A palette gets picked once and then trusted forever. This app is read on
 * cheap screens, often outdoors, often by someone who is frightened and in a
 * hurry — the one context where a colour that is merely "probably fine" is
 * not. Every pair the design system promises is legible is asserted here.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

function token(name: string): string {
  const match = CSS.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`--color-${name} is not defined in globals.css`);
  return match[1].trim();
}

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const ROLES = ["primary", "destructive", "warning", "success", "info"];

interface Check {
  label: string;
  fg: string;
  bg: string;
  /** 4.5 for body text, 3.0 for large text and non-text UI. */
  min: number;
}

const checks: Check[] = [];

for (const role of ROLES) {
  // A solid button's label.
  checks.push({
    label: `${role}-foreground on ${role}`,
    fg: token(`${role}-foreground`),
    bg: token(role),
    min: 4.5,
  });
  // Text inside a tinted panel of the same role.
  checks.push({
    label: `${role}-strong on ${role}-subtle`,
    fg: token(`${role}-strong`),
    bg: token(`${role}-subtle`),
    min: 4.5,
  });
  // The same text colour used on the page and on a card, which is what an
  // outline button or a coloured link actually sits on.
  checks.push({
    label: `${role}-strong on page`,
    fg: token(`${role}-strong`),
    bg: token("surface"),
    min: 4.5,
  });
  checks.push({
    label: `${role}-strong on card`,
    fg: token(`${role}-strong`),
    bg: token("surface-raised"),
    min: 4.5,
  });
  // The solid colour used as a border or icon against the page.
  checks.push({
    label: `${role} border/icon on page`,
    fg: token(role),
    bg: token("surface"),
    min: 3,
  });
}

// Body and secondary text on all three surfaces.
for (const [surface, name] of [
  [token("surface"), "page"],
  [token("surface-raised"), "card"],
  [token("muted"), "muted"],
] as const) {
  checks.push({ label: `ink on ${name}`, fg: token("hifazat-ink"), bg: surface, min: 4.5 });
  checks.push({
    label: `muted-foreground on ${name}`,
    fg: token("muted-foreground"),
    bg: surface,
    min: 4.5,
  });
}

let failed = 0;
for (const { label, fg, bg, min } of checks) {
  const ratio = contrast(fg, bg);
  const ok = ratio >= min;
  if (!ok) failed++;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${label.padEnd(36)} ${ratio.toFixed(2)}:1 (needs ${min})`,
  );
}

console.log(
  failed === 0
    ? `\n✓ ${checks.length} colour pairs meet WCAG AA.`
    : `\n✗ ${failed} of ${checks.length} pairs are below the threshold.`,
);
process.exit(failed === 0 ? 0 : 1);
