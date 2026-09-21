/* ============================================================
   In-memory, per-process rate limiting for the public form
   endpoints (§6).

   Honest about what this is: on Vercel there are several instances
   and this map isn't shared between them, so the real ceiling is
   roughly `max` × instances. That still turns an unattended script
   into a slow one, which is the point at this size. If abuse ever
   becomes real, move the counter to Postgres or Upstash — the
   call sites don't change.
   ============================================================ */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/* Bounded so a flood of unique IPs can't grow the map without end. */
const MAX_KEYS = 5000;

export function rateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    if (buckets.size > MAX_KEYS) {
      for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
      if (buckets.size > MAX_KEYS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export async function clientIp(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "local";
}
