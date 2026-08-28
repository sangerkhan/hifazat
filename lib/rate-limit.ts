import { getServiceClient } from "./db/client";

/**
 * Rate limiting, shared across instances when a database is available.
 *
 * The in-memory limiter is kept as a fallback rather than deleted. On a
 * serverless platform it only limits within one warm instance, which is weak —
 * but weak is better than none, and it means an unconfigured deploy still
 * refuses an obvious flood.
 */

interface Window {
  max: number;
  windowSeconds: number;
}

const memory = new Map<string, number[]>();

function memoryAllows(bucket: string, { max, windowSeconds }: Window): boolean {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const recent = (memory.get(bucket) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    memory.set(bucket, recent);
    return false;
  }

  recent.push(now);
  memory.set(bucket, recent);

  if (memory.size > 5000) {
    for (const [key, times] of memory) {
      if (times.every((t) => now - t >= windowMs)) memory.delete(key);
    }
  }

  return true;
}

/**
 * True when the request may proceed.
 *
 * Fails open. A rate limiter that starts refusing real people because the
 * database is briefly unreachable is worse than one that briefly stops
 * limiting — this endpoint is how someone in danger reaches a lawyer.
 */
export async function allowRequest(bucket: string, window: Window): Promise<boolean> {
  const client = getServiceClient();

  if (!client) return memoryAllows(bucket, window);

  try {
    const { data, error } = await client.rpc("check_rate_limit", {
      p_bucket: bucket,
      p_max: window.max,
      p_window_seconds: window.windowSeconds,
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error("[rate-limit] database check failed, falling back to memory:", error);
    return memoryAllows(bucket, window);
  }
}

/** Derives a per-client bucket from the request, namespaced by endpoint. */
export function clientBucket(request: Request, namespace: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : (request.headers.get("x-real-ip") ?? "unknown");
  return `${namespace}:${ip}`;
}
