import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase access, server-side only.
 *
 * Everything that touches the database runs inside a route handler, so the
 * service role key never reaches the browser. The anon key is not used at all
 * today: the RLS policies exist as defence in depth rather than as the primary
 * control, and are what would let a future admin UI read reference data
 * directly.
 *
 * The whole layer is optional. If the environment variables are absent, every
 * caller falls back to the datasets bundled in lib/, so the app runs exactly as
 * it does now with no database at all. That property is the reason the cutover
 * can be done without a flag day.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

/**
 * The service-role client. Bypasses RLS, so it must never be constructed in
 * code that could run in the browser.
 */
export function getServiceClient(): SupabaseClient | null {
  if (!isDatabaseConfigured()) return null;
  if (cached) return cached;

  cached = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "hifazat" } },
  });

  return cached;
}

/**
 * Runs a database read with a timeout and a fallback.
 *
 * The rule this encodes: a database problem must never become a user-facing
 * failure. Someone in a crisis gets the bundled data and never learns there was
 * an outage. Reads are capped well below the model call they precede, because a
 * slow database that eventually answers is worse than one that gives up and
 * lets the fallback serve.
 */
export async function withFallback<T>(
  label: string,
  read: (client: SupabaseClient) => Promise<T>,
  fallback: () => T,
  timeoutMs = 2500,
): Promise<{ value: T; usedFallback: boolean }> {
  const client = getServiceClient();
  if (!client) return { value: fallback(), usedFallback: true };

  try {
    const value = await Promise.race([
      read(client),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
    return { value, usedFallback: false };
  } catch (error) {
    console.error(`[db] ${label} failed, using bundled data:`, error);
    return { value: fallback(), usedFallback: true };
  }
}
