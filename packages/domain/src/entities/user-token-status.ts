/**
 * View-only derived state of a user token.
 *
 * This is NOT a column on `public.user_tokens`. It is computed at render time
 * from `revoked` + `expires_at`. Phase 1 derives it in the presentation layer;
 * RFC 0004 may compute it server-side once live data wiring lands.
 */
export type UserTokenStatus = 'active' | 'expired' | 'revoked';

/**
 * Pure, deterministic helper that derives the current status from the two
 * persisted fields that actually matter.
 *
 * Ordering: `revoked` beats `expired` — a revoked token is revoked regardless
 * of how `expires_at` compares to the clock.
 *
 * Boundary: `expires_at <= nowUnix` is `'expired'` (inclusive). A token whose
 * `expires_at` equals the current second has already expired.
 *
 * The optional `nowUnix` argument exists so tests can assert boundary cases
 * without depending on wall-clock time.
 */
export function deriveUserTokenStatus(input: {
  revoked: boolean;
  expires_at: number;
  nowUnix?: number;
}): UserTokenStatus {
  if (input.revoked) return 'revoked';
  const now = input.nowUnix ?? Math.floor(Date.now() / 1000);
  if (input.expires_at <= now) return 'expired';
  return 'active';
}
