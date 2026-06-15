import jwt from 'jsonwebtoken';
import { z } from 'zod';

/**
 * `UserTokenScope` — duplicated here instead of importing from `@qlm/domain`
 * so `@qlm/auth-shared` stays a standalone package portable to
 * `qlm-public-api` without pulling the domain graph with it. The three
 * values are the same as in `packages/domain/src/entities/user-token-scope.ts`.
 */
export type UserTokenScope = 'read' | 'write' | 'admin';

/**
 * Zod schema for the JWT payload v3 issues. If a decoded token doesn't match
 * this shape, the middleware reports `invalid-signature` — callers don't need
 * to distinguish "bad crypto" from "bad payload shape" because both mean the
 * same thing operationally: the token isn't one of ours.
 */
export const BearerJwtPayloadSchema = z.object({
  token_id: z.string().min(1),
  sub: z.string().min(1),
  scopes: z.array(z.enum(['read', 'write', 'admin'])).min(1),
  exp: z.number().int().positive(),
});

export type BearerJwtPayload = z.infer<typeof BearerJwtPayloadSchema>;

export type VerifyBearerTokenRejection =
  | { ok: false; reason: 'no-auth' }
  | { ok: false; reason: 'invalid-signature' }
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'revoked' }
  | { ok: false; reason: 'expired' };

export type VerifyBearerTokenSuccess = {
  ok: true;
  accountId: string;
  scopes: UserTokenScope[];
};

export type VerifyBearerTokenResult =
  | VerifyBearerTokenSuccess
  | VerifyBearerTokenRejection;

/**
 * Result of the caller-injected `lookup` function — the minimum shape the
 * middleware needs to enforce revocation + expiry. `expires_at` is Unix-epoch
 * seconds (matching `public.user_tokens.expires_at`).
 *
 * `null` means "no row with this `token_id`", which maps to `not-found`.
 */
export type BearerTokenLookupResult = {
  revoked: boolean;
  expires_at: number;
} | null;

/**
 * Verify an `Authorization: Bearer <jwt>` header.
 *
 * Why `lookup` is injected instead of the module owning the DB call: this
 * package is meant to be consumed by both the v3 server and
 * `qlm-public-api`, and they have different DB clients. Injecting the
 * lookup keeps the module portable and testable with an in-memory Map.
 *
 * Rejection precedence (matters for the revoked-AND-expired case): revoked
 * beats expired. A revoked token reports `revoked` even if its `expires_at`
 * is also in the past. Rationale: the revocation is a user action and that's
 * the message the user cares about.
 */
export async function verifyBearerToken(
  authHeader: string | null,
  jwtSecret: string,
  lookup: (tokenId: string) => Promise<BearerTokenLookupResult>,
): Promise<VerifyBearerTokenResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, reason: 'no-auth' };
  }

  const rawToken = authHeader.slice('Bearer '.length).trim();
  if (!rawToken) {
    return { ok: false, reason: 'no-auth' };
  }

  let decoded: unknown;
  try {
    decoded = jwt.verify(rawToken, jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return { ok: false, reason: 'invalid-signature' };
  }

  const parsed = BearerJwtPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    return { ok: false, reason: 'invalid-signature' };
  }

  const { token_id, sub, scopes } = parsed.data;

  const row = await lookup(token_id);
  if (row === null) {
    return { ok: false, reason: 'not-found' };
  }

  if (row.revoked) {
    return { ok: false, reason: 'revoked' };
  }

  if (row.expires_at * 1000 < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, accountId: sub, scopes };
}

/**
 * Map a token scope array to an allow/deny decision for a given HTTP method.
 *
 * - `admin` → any method allowed.
 * - `read` → GET only.
 * - `write` → POST / PUT / DELETE only (mutation methods).
 *
 * Multiple scopes on one token are OR'd — if any scope permits the method,
 * the call goes through. This mirrors v1's `qlm-public-api` behavior so
 * existing tokens keep working.
 */
export function scopePermitsMethod(
  scopes: UserTokenScope[],
  method: string,
): boolean {
  const upper = method.toUpperCase();
  return scopes.some((scope) => {
    if (scope === 'admin') return true;
    if (scope === 'read') return upper === 'GET';
    if (scope === 'write')
      return upper === 'POST' || upper === 'PUT' || upper === 'DELETE';
    return false;
  });
}
