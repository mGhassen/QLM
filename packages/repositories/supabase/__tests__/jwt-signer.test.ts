import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import { JwtSigner } from '../src/jwt-signer';

const SECRET = 'test-secret-with-enough-bits-to-sign-HS256-safely';
const OTHER_SECRET = 'other-secret-with-enough-bits-to-sign-HS256-safely';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const TOKEN_ID = '11111111-1111-1111-1111-111111111111';

const payload = {
  token_id: TOKEN_ID,
  sub: ACCOUNT_ID,
  scopes: ['read', 'write'] as const,
  exp: Math.floor(Date.now() / 1000) + 3600,
  aud: 'authenticated' as const,
  role: 'authenticated' as const,
};

describe('JwtSigner', () => {
  it('returns a non-empty string token', () => {
    const signer = new JwtSigner();
    const token = signer.sign(payload, { secret: SECRET, algorithm: 'HS256' });
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    expect(token.split('.')).toHaveLength(3);
  });

  it('round-trips via jsonwebtoken.verify with the same secret', () => {
    const signer = new JwtSigner();
    const token = signer.sign(payload, { secret: SECRET, algorithm: 'HS256' });

    const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    expect(decoded).toMatchObject({
      token_id: TOKEN_ID,
      sub: ACCOUNT_ID,
      scopes: ['read', 'write'],
      exp: payload.exp,
      aud: 'authenticated',
      role: 'authenticated',
    });
  });

  it('fails verification with a different secret', () => {
    const signer = new JwtSigner();
    const token = signer.sign(payload, { secret: SECRET, algorithm: 'HS256' });

    expect(() =>
      jwt.verify(token, OTHER_SECRET, { algorithms: ['HS256'] }),
    ).toThrow();
  });
});
