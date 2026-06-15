/**
 * Tiny in-memory sliding-window rate limiter used by the integrations routes
 * to cap `POST /:id/test` and `POST /test-draft` at N attempts per minute
 * per key. Sized for a single-process deployment; phase 2 will promote this
 * to a distributed limiter (Redis or a Postgres-row counter) once the
 * server scales horizontally.
 *
 * Usage:
 *
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
 *   const result = limiter.check(`test:${userId}:${projectId}`);
 *   if (!result.allowed) return c.json({ ... }, 429);
 */
export type RateLimitDecision =
  | { allowed: true; remaining: number; retryAfterSeconds: 0 }
  | { allowed: false; remaining: 0; retryAfterSeconds: number };

export type RateLimiter = {
  /** Record an attempt and return whether it was allowed. */
  check(key: string, now?: number): RateLimitDecision;
  /** Test-only: reset the counters. */
  reset(): void;
};

export function createRateLimiter(opts: {
  windowMs: number;
  max: number;
}): RateLimiter {
  const { windowMs, max } = opts;
  const hits = new Map<string, number[]>();

  return {
    check(key, now = Date.now()): RateLimitDecision {
      const cutoff = now - windowMs;
      const bucket = hits.get(key) ?? [];
      // Drop any recorded hit that has aged out of the window.
      const fresh = bucket.filter((timestamp) => timestamp > cutoff);

      if (fresh.length >= max) {
        const oldest = fresh[0] ?? now;
        const retryAfterMs = Math.max(0, oldest + windowMs - now);
        hits.set(key, fresh);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
        };
      }

      fresh.push(now);
      hits.set(key, fresh);
      return {
        allowed: true,
        remaining: max - fresh.length,
        retryAfterSeconds: 0,
      };
    },
    reset() {
      hits.clear();
    },
  };
}
