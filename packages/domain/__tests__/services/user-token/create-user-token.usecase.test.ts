import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

import type { UserToken } from '../../../src/entities';
import {
  IJwtSigner,
  type JwtSignerOptions,
  type JwtSignerPayload,
} from '../../../src/repositories/jwt-signer.port';
import {
  IUserTokenRepository,
  type CreateUserTokenRow,
} from '../../../src/repositories/user-token.port';
import { CreateUserTokenService } from '../../../src/services/user-token/create-user-token.usecase';

class MockUserTokenRepository extends IUserTokenRepository {
  public createInput: CreateUserTokenRow | null = null;
  public createImpl: (input: CreateUserTokenRow) => Promise<UserToken> = async (
    input,
  ) => this.defaultRow(input);

  async findAll(): Promise<UserToken[]> {
    throw new Error('not used');
  }
  async findById(): Promise<UserToken | null> {
    throw new Error('not used');
  }
  async findByAccountId(): Promise<UserToken[]> {
    throw new Error('not used');
  }
  async create(input: CreateUserTokenRow): Promise<UserToken> {
    this.createInput = input;
    return this.createImpl(input);
  }
  async revoke(): Promise<UserToken | null> {
    throw new Error('not used');
  }

  private defaultRow(input: CreateUserTokenRow): UserToken {
    return {
      id: '11111111-1111-1111-1111-111111111111',
      account_id: input.account_id,
      token_name: input.token_name,
      scopes: input.scopes,
      expires_at: input.expires_at,
      revoked: false,
      revoked_at: null,
      created_at: '2026-04-16T00:00:00.000Z',
      updated_at: '2026-04-16T00:00:00.000Z',
      created_by: input.account_id,
      updated_by: input.account_id,
    };
  }
}

class MockJwtSigner extends IJwtSigner {
  public readonly calls: Array<{
    payload: JwtSignerPayload;
    options: JwtSignerOptions;
  }> = [];
  public signImpl: (
    payload: JwtSignerPayload,
    options: JwtSignerOptions,
  ) => string = () => 'mock-jwt-signature';

  sign(payload: JwtSignerPayload, options: JwtSignerOptions): string {
    this.calls.push({ payload, options });
    return this.signImpl(payload, options);
  }
}

const FIXED_NOW_MS = Date.UTC(2026, 3, 16, 0, 0, 0);
const NOW_SECONDS = Math.floor(FIXED_NOW_MS / 1000);
const ONE_DAY_SECONDS = 86_400;
const ONE_YEAR_SECONDS = 365 * ONE_DAY_SECONDS;

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const TEST_SECRET = 'test-secret';

describe('CreateUserTokenService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW_MS));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists the row, signs the JWT with the exact payload + options, and returns { row, rawJwt }', async () => {
    const repo = new MockUserTokenRepository();
    const signer = new MockJwtSigner();
    signer.signImpl = () => 'signed.jwt.value';

    const service = new CreateUserTokenService(repo, signer, TEST_SECRET);

    const result = await service.execute({
      accountId: ACCOUNT_ID,
      token_name: 'CI deploy token',
      scopes: ['read', 'write'],
      expires_at: NOW_SECONDS + 30 * ONE_DAY_SECONDS,
    });

    expect(repo.createInput).toEqual({
      account_id: ACCOUNT_ID,
      token_name: 'CI deploy token',
      scopes: ['read', 'write'],
      expires_at: NOW_SECONDS + 30 * ONE_DAY_SECONDS,
    });

    expect(signer.calls).toHaveLength(1);
    expect(signer.calls[0]!.payload).toEqual({
      token_id: '11111111-1111-1111-1111-111111111111',
      sub: ACCOUNT_ID,
      scopes: ['read', 'write'],
      exp: NOW_SECONDS + 30 * ONE_DAY_SECONDS,
      aud: 'authenticated',
      role: 'authenticated',
    });
    expect(signer.calls[0]!.options).toEqual({
      secret: TEST_SECRET,
      algorithm: 'HS256',
    });

    expect(result.rawJwt).toBe('signed.jwt.value');
    expect(result.row.id).toBe('11111111-1111-1111-1111-111111111111');
    expect(result.row.scopes).toEqual(['read', 'write']);
  });

  it('rejects empty token_name before touching the repo or signer', async () => {
    const repo = new MockUserTokenRepository();
    const signer = new MockJwtSigner();
    const service = new CreateUserTokenService(repo, signer, TEST_SECRET);

    await expect(
      service.execute({
        accountId: ACCOUNT_ID,
        token_name: '',
        scopes: ['read'],
        expires_at: NOW_SECONDS + ONE_DAY_SECONDS,
      }),
    ).rejects.toThrow(ZodError);

    expect(repo.createInput).toBeNull();
    expect(signer.calls).toHaveLength(0);
  });

  it('rejects empty scopes before touching the repo or signer', async () => {
    const repo = new MockUserTokenRepository();
    const signer = new MockJwtSigner();
    const service = new CreateUserTokenService(repo, signer, TEST_SECRET);

    await expect(
      service.execute({
        accountId: ACCOUNT_ID,
        token_name: 'token',
        scopes: [],
        expires_at: NOW_SECONDS + ONE_DAY_SECONDS,
      }),
    ).rejects.toThrow(ZodError);

    expect(repo.createInput).toBeNull();
    expect(signer.calls).toHaveLength(0);
  });

  it('rejects expires_at equal to now (exclusive lower bound)', async () => {
    const repo = new MockUserTokenRepository();
    const signer = new MockJwtSigner();
    const service = new CreateUserTokenService(repo, signer, TEST_SECRET);

    await expect(
      service.execute({
        accountId: ACCOUNT_ID,
        token_name: 'token',
        scopes: ['read'],
        expires_at: NOW_SECONDS,
      }),
    ).rejects.toThrow(ZodError);

    expect(repo.createInput).toBeNull();
    expect(signer.calls).toHaveLength(0);
  });

  it('rejects expires_at beyond 365 days from now', async () => {
    const repo = new MockUserTokenRepository();
    const signer = new MockJwtSigner();
    const service = new CreateUserTokenService(repo, signer, TEST_SECRET);

    await expect(
      service.execute({
        accountId: ACCOUNT_ID,
        token_name: 'token',
        scopes: ['read'],
        expires_at: NOW_SECONDS + ONE_YEAR_SECONDS + 1,
      }),
    ).rejects.toThrow(ZodError);

    expect(repo.createInput).toBeNull();
    expect(signer.calls).toHaveLength(0);
  });

  it('accepts expires_at exactly now + 365d (inclusive upper bound)', async () => {
    const repo = new MockUserTokenRepository();
    const signer = new MockJwtSigner();
    const service = new CreateUserTokenService(repo, signer, TEST_SECRET);

    await expect(
      service.execute({
        accountId: ACCOUNT_ID,
        token_name: 'token',
        scopes: ['read'],
        expires_at: NOW_SECONDS + ONE_YEAR_SECONDS,
      }),
    ).resolves.toBeDefined();

    expect(repo.createInput).not.toBeNull();
    expect(signer.calls).toHaveLength(1);
  });

  it('rethrows when the repository rejects (persistence failure)', async () => {
    const repo = new MockUserTokenRepository();
    repo.createImpl = async () => {
      throw new Error('postgres insert failed');
    };
    const signer = new MockJwtSigner();
    const service = new CreateUserTokenService(repo, signer, TEST_SECRET);

    await expect(
      service.execute({
        accountId: ACCOUNT_ID,
        token_name: 'token',
        scopes: ['read'],
        expires_at: NOW_SECONDS + ONE_DAY_SECONDS,
      }),
    ).rejects.toThrow('postgres insert failed');

    expect(signer.calls).toHaveLength(0);
  });

  it('rethrows when the JWT signer throws (row already persisted in phase 1)', async () => {
    const repo = new MockUserTokenRepository();
    const signer = new MockJwtSigner();
    signer.signImpl = () => {
      throw new Error('signing failed');
    };
    const service = new CreateUserTokenService(repo, signer, TEST_SECRET);

    await expect(
      service.execute({
        accountId: ACCOUNT_ID,
        token_name: 'token',
        scopes: ['read'],
        expires_at: NOW_SECONDS + ONE_DAY_SECONDS,
      }),
    ).rejects.toThrow('signing failed');

    expect(repo.createInput).not.toBeNull();
  });
});
