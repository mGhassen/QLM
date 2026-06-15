import { describe, expect, it } from 'vitest';

import { UserTokenSchema } from '../../src/entities/user-token.type';

const validRow = () => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  account_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  token_name: 'my-cli-token',
  scopes: ['read', 'write'] as const,
  expires_at: 1_800_000_000,
  revoked: false,
  revoked_at: null,
  created_at: '2026-04-14T00:00:00.000Z',
  updated_at: '2026-04-14T00:00:00.000Z',
  created_by: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  updated_by: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
});

describe('UserTokenSchema', () => {
  describe('happy path', () => {
    it('parses a valid row', () => {
      const parsed = UserTokenSchema.parse(validRow());
      expect(parsed.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(parsed.token_name).toBe('my-cli-token');
      expect(parsed.scopes).toEqual(['read', 'write']);
      expect(parsed.revoked).toBe(false);
    });
  });

  describe('revoked null-normalisation', () => {
    it('coerces revoked: null to revoked: false', () => {
      const parsed = UserTokenSchema.parse({ ...validRow(), revoked: null });
      expect(parsed.revoked).toBe(false);
    });

    it('accepts revoked: true as-is', () => {
      const parsed = UserTokenSchema.parse({
        ...validRow(),
        revoked: true,
        revoked_at: '2026-04-14T12:00:00.000Z',
      });
      expect(parsed.revoked).toBe(true);
    });

    it('accepts revoked: false as-is', () => {
      const parsed = UserTokenSchema.parse({ ...validRow(), revoked: false });
      expect(parsed.revoked).toBe(false);
    });
  });

  describe('required fields', () => {
    it('rejects a row missing account_id', () => {
      const { account_id: _account_id, ...rest } = validRow();
      void _account_id;
      expect(() => UserTokenSchema.parse(rest)).toThrow();
    });

    it('rejects a row missing token_name', () => {
      const { token_name: _token_name, ...rest } = validRow();
      void _token_name;
      expect(() => UserTokenSchema.parse(rest)).toThrow();
    });

    it('rejects an empty token_name', () => {
      expect(() =>
        UserTokenSchema.parse({ ...validRow(), token_name: '' }),
      ).toThrow();
    });

    it('rejects a token_name longer than 255 characters', () => {
      expect(() =>
        UserTokenSchema.parse({
          ...validRow(),
          token_name: 'x'.repeat(256),
        }),
      ).toThrow();
    });

    it('accepts a token_name exactly 255 characters long', () => {
      expect(() =>
        UserTokenSchema.parse({
          ...validRow(),
          token_name: 'x'.repeat(255),
        }),
      ).not.toThrow();
    });

    it('rejects an empty scopes array', () => {
      expect(() =>
        UserTokenSchema.parse({ ...validRow(), scopes: [] }),
      ).toThrow();
    });

    it('rejects an unknown scope value in the array', () => {
      expect(() =>
        UserTokenSchema.parse({ ...validRow(), scopes: ['read', 'superuser'] }),
      ).toThrow();
    });
  });

  describe('expires_at type', () => {
    it('rejects expires_at as a float', () => {
      expect(() =>
        UserTokenSchema.parse({ ...validRow(), expires_at: 1.5 }),
      ).toThrow();
    });

    it('rejects expires_at as a string', () => {
      expect(() =>
        UserTokenSchema.parse({ ...validRow(), expires_at: '1800000000' }),
      ).toThrow();
    });

    it('rejects a zero or negative expires_at', () => {
      expect(() =>
        UserTokenSchema.parse({ ...validRow(), expires_at: 0 }),
      ).toThrow();

      expect(() =>
        UserTokenSchema.parse({ ...validRow(), expires_at: -1 }),
      ).toThrow();
    });
  });

  describe('nullable fields', () => {
    it('accepts revoked_at as null', () => {
      const parsed = UserTokenSchema.parse({
        ...validRow(),
        revoked_at: null,
      });
      expect(parsed.revoked_at).toBeNull();
    });

    it('accepts revoked_at as an ISO timestamp', () => {
      const parsed = UserTokenSchema.parse({
        ...validRow(),
        revoked: true,
        revoked_at: '2026-04-14T12:34:56.000Z',
      });
      expect(parsed.revoked_at).toBe('2026-04-14T12:34:56.000Z');
    });

    it('accepts created_at and updated_at as null', () => {
      const parsed = UserTokenSchema.parse({
        ...validRow(),
        created_at: null,
        updated_at: null,
      });
      expect(parsed.created_at).toBeNull();
      expect(parsed.updated_at).toBeNull();
    });
  });
});
