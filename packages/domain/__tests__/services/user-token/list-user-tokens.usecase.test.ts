import { describe, expect, it } from 'vitest';

import type { UserToken } from '../../../src/entities';
import {
  IUserTokenRepository,
  type CreateUserTokenRow,
} from '../../../src/repositories/user-token.port';
import { ListUserTokensService } from '../../../src/services/user-token/list-user-tokens.usecase';

class MockUserTokenRepository extends IUserTokenRepository {
  public findByAccountIdCalls: string[] = [];
  public findByAccountIdImpl: (accountId: string) => Promise<UserToken[]> =
    async () => [];

  async findAll(): Promise<UserToken[]> {
    throw new Error('not used');
  }
  async findById(): Promise<UserToken | null> {
    throw new Error('not used');
  }
  async findByAccountId(accountId: string): Promise<UserToken[]> {
    this.findByAccountIdCalls.push(accountId);
    return this.findByAccountIdImpl(accountId);
  }
  async create(_input: CreateUserTokenRow): Promise<UserToken> {
    throw new Error('not used');
  }
  async revoke(): Promise<UserToken | null> {
    throw new Error('not used');
  }
}

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';

function makeRow(id: string): UserToken {
  return {
    id,
    account_id: ACCOUNT_ID,
    token_name: `token-${id}`,
    scopes: ['read'],
    expires_at: 9_999_999_999,
    revoked: false,
    revoked_at: null,
    created_at: '2026-04-15T00:00:00.000Z',
    updated_at: '2026-04-15T00:00:00.000Z',
    created_by: ACCOUNT_ID,
    updated_by: ACCOUNT_ID,
  };
}

describe('ListUserTokensService', () => {
  it('returns the rows the repository returns, unchanged', async () => {
    const repo = new MockUserTokenRepository();
    const rows = [
      makeRow('33333333-3333-3333-3333-333333333333'),
      makeRow('44444444-4444-4444-4444-444444444444'),
    ];
    repo.findByAccountIdImpl = async () => rows;

    const service = new ListUserTokensService(repo);

    const result = await service.execute({ accountId: ACCOUNT_ID });

    expect(result).toBe(rows);
    expect(repo.findByAccountIdCalls).toEqual([ACCOUNT_ID]);
  });

  it('returns an empty array untouched', async () => {
    const repo = new MockUserTokenRepository();
    repo.findByAccountIdImpl = async () => [];
    const service = new ListUserTokensService(repo);

    const result = await service.execute({ accountId: ACCOUNT_ID });

    expect(result).toEqual([]);
  });

  it('rethrows when the repository fails', async () => {
    const repo = new MockUserTokenRepository();
    repo.findByAccountIdImpl = async () => {
      throw new Error('postgres timeout');
    };
    const service = new ListUserTokensService(repo);

    await expect(service.execute({ accountId: ACCOUNT_ID })).rejects.toThrow(
      'postgres timeout',
    );
  });
});
