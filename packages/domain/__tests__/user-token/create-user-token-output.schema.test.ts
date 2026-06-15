import { describe, expect, it } from 'vitest';

import {
  CreateUserTokenOutputSchema,
  RevokeUserTokenOutputSchema,
} from '../../src/usecases/dto/user-token-usecase-dto';

const validRow = () => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  account_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  token_name: 'my-cli-token',
  scopes: ['read'] as const,
  expires_at: 1_800_000_000,
  revoked: false,
  revoked_at: null,
  created_at: '2026-04-14T00:00:00.000Z',
  updated_at: '2026-04-14T00:00:00.000Z',
  created_by: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  updated_by: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
});

describe('CreateUserTokenOutputSchema', () => {
  it('parses a valid { row, rawJwt } shape', () => {
    const parsed = CreateUserTokenOutputSchema.parse({
      row: validRow(),
      rawJwt: 'eyJhbGciOiJIUzI1NiJ9.fake.signature',
    });
    expect(parsed.rawJwt).toBe('eyJhbGciOiJIUzI1NiJ9.fake.signature');
    expect(parsed.row.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('rejects an empty rawJwt', () => {
    expect(() =>
      CreateUserTokenOutputSchema.parse({ row: validRow(), rawJwt: '' }),
    ).toThrow();
  });

  it('rejects a missing rawJwt', () => {
    expect(() =>
      CreateUserTokenOutputSchema.parse({ row: validRow() }),
    ).toThrow();
  });

  it('rejects a missing row', () => {
    expect(() => CreateUserTokenOutputSchema.parse({ rawJwt: 'x' })).toThrow();
  });

  it('validates the row against UserTokenSchema (invalid row rejected)', () => {
    expect(() =>
      CreateUserTokenOutputSchema.parse({
        row: { ...validRow(), token_name: '' },
        rawJwt: 'x',
      }),
    ).toThrow();
  });
});

describe('RevokeUserTokenOutputSchema', () => {
  it('parses a valid UserToken row (alias of UserTokenSchema)', () => {
    const parsed = RevokeUserTokenOutputSchema.parse({
      ...validRow(),
      revoked: true,
      revoked_at: '2026-04-14T12:00:00.000Z',
    });
    expect(parsed.revoked).toBe(true);
    expect(parsed.revoked_at).toBe('2026-04-14T12:00:00.000Z');
  });
});
