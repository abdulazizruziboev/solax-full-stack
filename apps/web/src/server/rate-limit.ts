import "server-only"

// Minimal in-memory failed-attempt limiter for the login endpoints. The web
// app runs as a single container, so process memory is enough; a restart simply
// clears the counters. Keyed per client IP, plus one global bucket so rotating
// forged X-Forwarded-For values can't be used to brute-force the PIN.

interface Bucket {
  failures: number
  windowStart: number
  lockedUntil: number
}

const WINDOW_MS = 15 * 60_000
const LOCK_MS = 15 * 60_000
const MAX_PER_KEY = 5
const MAX_GLOBAL = 50
const GLOBAL_KEY = "__global__"
const MAX_TRACKED_KEYS = 5_000

const buckets = new Map<string, Bucket>()

function getBucket(key: string, now: number): Bucket {
  let b = buckets.get(key)
  if (!b || now - b.windowStart > WINDOW_MS) {
    b = { failures: 0, windowStart: now, lockedUntil: b?.lockedUntil ?? 0 }
    buckets.set(key, b)
  }
  return b
}

/** Seconds the caller must wait before trying again, or 0 when allowed. */
export function loginRetryAfter(key: string, now = Date.now()): number {
  const until = Math.max(
    buckets.get(key)?.lockedUntil ?? 0,
    buckets.get(GLOBAL_KEY)?.lockedUntil ?? 0
  )
  return until > now ? Math.ceil((until - now) / 1000) : 0
}

export function recordLoginFailure(key: string, now = Date.now()): void {
  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [k, b] of buckets) {
      if (b.lockedUntil < now && now - b.windowStart > WINDOW_MS) buckets.delete(k)
    }
  }
  const perKey = getBucket(key, now)
  perKey.failures += 1
  if (perKey.failures >= MAX_PER_KEY) perKey.lockedUntil = now + LOCK_MS

  const global = getBucket(GLOBAL_KEY, now)
  global.failures += 1
  if (global.failures >= MAX_GLOBAL) global.lockedUntil = now + LOCK_MS
}

export function recordLoginSuccess(key: string): void {
  buckets.delete(key)
}
