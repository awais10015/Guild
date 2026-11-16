/** in-memory sliding-window rate limiter (swap for Redis later) */

const globalForLimiter = globalThis as unknown as {
  __guildRateLimit: Map<string, number[]>;
};

const buckets: Map<string, number[]> =
  globalForLimiter.__guildRateLimit ?? new Map();
globalForLimiter.__guildRateLimit = buckets;

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    // crude cleanup to keep memory bounded
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t > windowMs)) buckets.delete(k);
    }
  }
  return true;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "local";
}
