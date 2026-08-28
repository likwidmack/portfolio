/**
 * Best-effort in-memory rate limit for public message creates.
 * Complements API Gateway throttling; not a multi-instance hard quota.
 */
type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 5;
/** Soft cap — prune expired entries when the map grows past this size. */
const MAX_BUCKETS = 10_000;

function clientKey(event: {
  node?: { req?: { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } } };
}): string {
  const headers = event.node?.req?.headers ?? {};
  const forwarded = headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof forwardedValue === 'string' && forwardedValue.trim()) {
    return forwardedValue.split(',')[0]?.trim() || 'unknown';
  }
  return event.node?.req?.socket?.remoteAddress || 'unknown';
}

/** Best-effort cleanup so long-lived Node processes do not retain expired client keys forever. */
function pruneExpiredBuckets(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Returns true when the client is still within the hourly create budget.
 */
export function allowMessageCreate(event: Parameters<typeof clientKey>[0], now = Date.now()): boolean {
  pruneExpiredBuckets(now);
  const key = clientKey(event);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (existing.count >= LIMIT) return false;
  existing.count += 1;
  return true;
}

/** Test helper — clears rate-limit state between specs. */
export function resetMessageRateLimitForTests(): void {
  buckets.clear();
}
