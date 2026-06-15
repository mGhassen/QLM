import type { UserTokenScope } from '../entities';

/**
 * Exact shape of the JWT claim that `IJwtSigner` produces for a user token.
 *
 * Fields are locked to match v1's JWT shape so `guepard-public-api` and
 * `guepard-cli` continue to validate v3-issued tokens without change. See
 * RFC 0009 spec §6.3.
 *
 * - `token_id` — `public.user_tokens.id` — what the validator looks up to
 *   check revocation + expiry.
 * - `sub` — `account_id` — the owning `public.accounts` row (1:1 with auth.users).
 * - `scopes` — the token's scope array at creation time. Revocation is the only
 *   way to change scope; there is no "mutate scopes" path.
 * - `exp` — Unix-epoch seconds, matches `user_tokens.expires_at` (bigint).
 * - `aud` / `role` — literal strings matching the Supabase-session JWT shape
 *   the public-API validator expects.
 */
export type JwtSignerPayload = {
  token_id: string;
  sub: string;
  scopes: UserTokenScope[];
  exp: number;
  aud: 'authenticated';
  role: 'authenticated';
};

/**
 * Signing options. `algorithm` is literally `'HS256'` — not a generic string —
 * so a caller cannot silently request a different algorithm. `secret` is the
 * shared `JWT_SECRET` env value; the port does not load it itself, the factory
 * injects it.
 */
export type JwtSignerOptions = {
  secret: string;
  algorithm: 'HS256';
};

/**
 * Abstract service port for JWT signing. Kept separate from the persistence
 * port so `jsonwebtoken` never enters the pure-domain layer. The concrete
 * implementation lives in `packages/repositories/supabase` (Story 005) and
 * wraps `jsonwebtoken.sign(...)`.
 *
 * Intentionally synchronous (`: string`, not `: Promise<string>`): HS256 is a
 * tight HMAC and the existing `jsonwebtoken.sign(...)` call used in v1 is
 * synchronous. Making this async would force unnecessary awaits at every call
 * site.
 */
export abstract class IJwtSigner {
  public abstract sign(
    payload: JwtSignerPayload,
    options: JwtSignerOptions,
  ): string;
}
