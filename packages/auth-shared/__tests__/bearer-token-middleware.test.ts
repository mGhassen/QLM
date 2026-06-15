import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import {
  scopePermitsMethod,
  verifyBearerToken,
  type BearerTokenLookupResult,
  type UserTokenScope,
} from '../src/bearer-token-middleware';

const TEST_SECRET = 'test-secret-with-enough-bits-to-sign-HS256-safely';
const OTHER_SECRET = 'other-secret-with-enough-bits-to-sign-HS256-safely';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const TOKEN_ID = '11111111-1111-1111-1111-111111111111';

const ONE_HOUR_SECONDS = 3600;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function signToken(
  payload: Record<string, unknown>,
  secret: string = TEST_SECRET,
): string {
  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

function makeLookup(
  entries: Record<string, BearerTokenLookupResult>,
): (tokenId: string) => Promise<BearerTokenLookupResult> {
  return async (tokenId) => entries[tokenId] ?? null;
}

function validPayload(exp: number = nowSeconds() + ONE_HOUR_SECONDS) {
  return {
    token_id: TOKEN_ID,
    sub: ACCOUNT_ID,
    scopes: ['read', 'write'],
    exp,
  };
}

describe('verifyBearerToken', () => {
  it('returns no-auth when the header is null', async () => {
    const result = await verifyBearerToken(null, TEST_SECRET, makeLookup({}));
    expect(result).toEqual({ ok: false, reason: 'no-auth' });
  });

  it('returns no-auth when the header does not start with Bearer', async () => {
    const result = await verifyBearerToken(
      'Basic dXNlcjpwYXNz',
      TEST_SECRET,
      makeLookup({}),
    );
    expect(result).toEqual({ ok: false, reason: 'no-auth' });
  });

  it('returns no-auth when the Bearer scheme has an empty token', async () => {
    const result = await verifyBearerToken(
      'Bearer   ',
      TEST_SECRET,
      makeLookup({}),
    );
    expect(result).toEqual({ ok: false, reason: 'no-auth' });
  });

  it('returns invalid-signature when the JWT is signed with a different secret', async () => {
    const token = signToken(validPayload(), OTHER_SECRET);
    const result = await verifyBearerToken(
      `Bearer ${token}`,
      TEST_SECRET,
      makeLookup({
        [TOKEN_ID]: { revoked: false, expires_at: nowSeconds() + 3600 },
      }),
    );
    expect(result).toEqual({ ok: false, reason: 'invalid-signature' });
  });

  it('returns invalid-signature when the payload is missing token_id', async () => {
    const token = signToken({
      sub: ACCOUNT_ID,
      scopes: ['read'],
      exp: nowSeconds() + ONE_HOUR_SECONDS,
    });
    const result = await verifyBearerToken(
      `Bearer ${token}`,
      TEST_SECRET,
      makeLookup({}),
    );
    expect(result).toEqual({ ok: false, reason: 'invalid-signature' });
  });

  it('returns not-found when the lookup resolves to null', async () => {
    const token = signToken(validPayload());
    const result = await verifyBearerToken(
      `Bearer ${token}`,
      TEST_SECRET,
      makeLookup({}),
    );
    expect(result).toEqual({ ok: false, reason: 'not-found' });
  });

  it('returns revoked when the row is marked revoked (even if also expired)', async () => {
    const token = signToken(validPayload());
    const result = await verifyBearerToken(
      `Bearer ${token}`,
      TEST_SECRET,
      makeLookup({
        [TOKEN_ID]: {
          revoked: true,
          expires_at: nowSeconds() - ONE_HOUR_SECONDS,
        },
      }),
    );
    expect(result).toEqual({ ok: false, reason: 'revoked' });
  });

  it('returns expired when the row is not revoked but expires_at is in the past', async () => {
    const token = signToken(validPayload());
    const result = await verifyBearerToken(
      `Bearer ${token}`,
      TEST_SECRET,
      makeLookup({
        [TOKEN_ID]: {
          revoked: false,
          expires_at: nowSeconds() - ONE_HOUR_SECONDS,
        },
      }),
    );
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('returns ok with accountId + scopes when the token is valid and active', async () => {
    const token = signToken(validPayload());
    const result = await verifyBearerToken(
      `Bearer ${token}`,
      TEST_SECRET,
      makeLookup({
        [TOKEN_ID]: {
          revoked: false,
          expires_at: nowSeconds() + ONE_HOUR_SECONDS,
        },
      }),
    );
    expect(result).toEqual({
      ok: true,
      accountId: ACCOUNT_ID,
      scopes: ['read', 'write'],
    });
  });
});

describe('scopePermitsMethod', () => {
  const methods = ['GET', 'POST', 'PUT', 'DELETE'] as const;
  type Method = (typeof methods)[number];

  const matrix: Array<{
    scope: UserTokenScope;
    method: Method;
    allowed: boolean;
  }> = [
    { scope: 'read', method: 'GET', allowed: true },
    { scope: 'read', method: 'POST', allowed: false },
    { scope: 'read', method: 'PUT', allowed: false },
    { scope: 'read', method: 'DELETE', allowed: false },
    { scope: 'write', method: 'GET', allowed: false },
    { scope: 'write', method: 'POST', allowed: true },
    { scope: 'write', method: 'PUT', allowed: true },
    { scope: 'write', method: 'DELETE', allowed: true },
    { scope: 'admin', method: 'GET', allowed: true },
    { scope: 'admin', method: 'POST', allowed: true },
    { scope: 'admin', method: 'PUT', allowed: true },
    { scope: 'admin', method: 'DELETE', allowed: true },
  ];

  it.each(matrix)(
    'scope=$scope, method=$method → $allowed',
    ({ scope, method, allowed }) => {
      expect(scopePermitsMethod([scope], method)).toBe(allowed);
    },
  );

  it('OR-combines multiple scopes (read+write permits every verb)', () => {
    for (const method of methods) {
      expect(scopePermitsMethod(['read', 'write'], method)).toBe(true);
    }
  });

  it('is case-insensitive on the method argument', () => {
    expect(scopePermitsMethod(['read'], 'get')).toBe(true);
    expect(scopePermitsMethod(['write'], 'delete')).toBe(true);
  });
});
