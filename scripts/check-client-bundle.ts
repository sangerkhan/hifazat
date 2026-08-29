/**
 * Fails the build if anything secret reached the browser.
 *
 * The `server-only` markers stop a secret-reading module being imported from a
 * client component, and Next only inlines NEXT_PUBLIC_ variables into client
 * code. Both of those are conventions a future change can quietly step around
 * — a `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` added "just to get it working"
 * would satisfy every one of them. This reads what actually shipped instead.
 *
 * Runs as `postbuild`, so it runs on Vercel too: a leak fails the deploy rather
 * than reaching production and needing a key rotation.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Environment variables that must never appear in anything the browser loads. */
const SECRET_ENV_VARS = [
  "GEMINI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
  "RESEND_API_KEY",
  "GOOGLE_SHEETS_WEBHOOK_URL",
  "GOOGLE_SHEETS_SHARED_SECRET",
];

/**
 * Credential shapes, for the case that matters most: the variable name is
 * absent because the value was inlined at build time.
 */
const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{30,}/ },
  { name: "Resend API key", re: /\bre_[0-9A-Za-z]{20,}/ },
  { name: "OpenAI-style key", re: /\bsk-[0-9A-Za-z]{30,}/ },
  // Supabase anon and service-role keys are both JWTs. The anon key is
  // publishable in a normal Supabase app, but this app has no client-side
  // Supabase access at all, so any JWT in a browser bundle is a mistake.
  { name: "JWT (Supabase key)", re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./ },
];

/** Any NEXT_PUBLIC_ name that reads like a credential rather than a setting. */
const PUBLIC_SECRET_NAME = /NEXT_PUBLIC_[A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)/;

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(js|mjs|css|map|html|txt)$/.test(entry)) out.push(full);
  }
  return out;
}

const STATIC_DIR = join(process.cwd(), ".next", "static");
const files = walk(STATIC_DIR);

if (files.length === 0) {
  console.error(
    `✗ No client assets found under ${STATIC_DIR}. Run \`next build\` first — ` +
      `a check that scans nothing passes for the wrong reason.`,
  );
  process.exit(1);
}

const findings: string[] = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const rel = file.slice(process.cwd().length + 1);

  for (const name of SECRET_ENV_VARS) {
    if (content.includes(name)) findings.push(`${rel}: mentions ${name}`);
  }
  for (const { name, re } of SECRET_PATTERNS) {
    const hit = content.match(re);
    if (hit) findings.push(`${rel}: looks like a ${name} (${hit[0].slice(0, 12)}…)`);
  }
  const publicName = content.match(PUBLIC_SECRET_NAME);
  if (publicName) findings.push(`${rel}: credential-shaped public var ${publicName[0]}`);
}

if (findings.length > 0) {
  console.error("\n✗ Secrets found in client-side assets:\n");
  for (const f of findings) console.error(`   ${f}`);
  console.error(
    "\nAnything under .next/static is downloaded by every visitor. Move the " +
      "value behind a route handler, and rotate the credential — assume it is " +
      "already public if this build was deployed.\n",
  );
  process.exit(1);
}

console.log(`✓ No secrets in ${files.length} client assets.`);
