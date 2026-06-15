import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateUserTokenInputSchema } from '../../src/usecases/dto/user-token-usecase-dto';

const FIXED_DATE = new Date('2026-04-14T00:00:00.000Z');
const NOW_UNIX = Math.floor(FIXED_DATE.getTime() / 1000);
const ONE_DAY = 86_400;
const ONE_YEAR = 365 * ONE_DAY;

describe('CreateUserTokenInputSchema', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseInput = () => ({
    token_name: 'my-cli-token',
    scopes: ['read', 'write'] as const,
    expires_at: NOW_UNIX + 30 * ONE_DAY,
  });

  describe('happy path', () => {
    it('parses a valid input with all three scopes', () => {
      const parsed = CreateUserTokenInputSchema.parse({
        ...baseInput(),
        scopes: ['read', 'write', 'admin'],
      });
      expect(parsed.token_name).toBe('my-cli-token');
      expect(parsed.scopes).toEqual(['read', 'write', 'admin']);
      expect(parsed.expires_at).toBe(NOW_UNIX + 30 * ONE_DAY);
    });
  });

  describe('token_name validation', () => {
    it('rejects an empty token_name', () => {
      expect(() =>
        CreateUserTokenInputSchema.parse({ ...baseInput(), token_name: '' }),
      ).toThrow();
    });

    it('rejects a token_name longer than 255 chars', () => {
      expect(() =>
        CreateUserTokenInputSchema.parse({
          ...baseInput(),
          token_name: 'x'.repeat(256),
        }),
      ).toThrow();
    });
  });

  describe('scopes validation', () => {
    it('rejects empty scopes', () => {
      expect(() =>
        CreateUserTokenInputSchema.parse({ ...baseInput(), scopes: [] }),
      ).toThrow();
    });

    it('rejects an unknown scope value', () => {
      expect(() =>
        CreateUserTokenInputSchema.parse({
          ...baseInput(),
          scopes: ['read', 'superuser'],
        }),
      ).toThrow();
    });
  });

  describe('expires_at refinement boundaries', () => {
    it('rejects expires_at equal to now (strictly > now required)', () => {
      expect(() =>
        CreateUserTokenInputSchema.parse({
          ...baseInput(),
          expires_at: NOW_UNIX,
        }),
      ).toThrow();
    });

    it('rejects expires_at in the past', () => {
      expect(() =>
        CreateUserTokenInputSchema.parse({
          ...baseInput(),
          expires_at: NOW_UNIX - 1,
        }),
      ).toThrow();
    });

    it('accepts expires_at exactly 1 second in the future', () => {
      expect(() =>
        CreateUserTokenInputSchema.parse({
          ...baseInput(),
          expires_at: NOW_UNIX + 1,
        }),
      ).not.toThrow();
    });

    it('accepts expires_at exactly 365 days in the future (inclusive)', () => {
      expect(() =>
        CreateUserTokenInputSchema.parse({
          ...baseInput(),
          expires_at: NOW_UNIX + ONE_YEAR,
        }),
      ).not.toThrow();
    });

    it('rejects expires_at more than 365 days in the future', () => {
      expect(() =>
        CreateUserTokenInputSchema.parse({
          ...baseInput(),
          expires_at: NOW_UNIX + ONE_YEAR + 1,
        }),
      ).toThrow();
    });

    it('rejects a non-integer expires_at', () => {
      expect(() =>
        CreateUserTokenInputSchema.parse({
          ...baseInput(),
          expires_at: NOW_UNIX + 0.5,
        }),
      ).toThrow();
    });

    it('rejects a non-positive expires_at', () => {
      expect(() =>
        CreateUserTokenInputSchema.parse({ ...baseInput(), expires_at: 0 }),
      ).toThrow();

      expect(() =>
        CreateUserTokenInputSchema.parse({ ...baseInput(), expires_at: -1 }),
      ).toThrow();
    });
  });
});
