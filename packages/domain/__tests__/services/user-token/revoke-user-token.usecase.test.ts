import { describe, expect, it } from 'vitest';

import { Code } from '../../../src/common/code';
import type { UserToken } from '../../../src/entities';
import { DomainException } from '../../../src/exceptions';
import {
  IUserTokenRepository,
  type CreateUserTokenRow,
} from '../../../src/repositories/user-token.port';
import { RevokeUserTokenService } from '../../../src/services/user-token/revoke-user-token.usecase';

class MockUserTokenRepository extends IUserTokenRepository {
  public revokeCalls: Array<{ id: string; accountId: string }> = [];
  public revokeImpl: (
    id: string,
    accountId: string,
  ) => Promise<UserToken | null> = async () => null;

  async findAll(): Promise<UserToken[]> {
    throw new Error('not used');
  }
  async findById(): Promise<UserToken | null> {
    throw new Error('not used');
  }
  async findByAccountId(): Promise<UserToken[]> {
    throw new Error('not used');
  }
  async create(_input: CreateUserTokenRow): Promise<UserToken> {
    throw new Error('not used');
  }
  async revoke(id: string, accountId: string): Promise<UserToken | null> {
    this.revokeCalls.push({ id, accountId });
    return this.revokeImpl(id, accountId);
  }
}

const TOKEN_ID = '22222222-2222-2222-2222-222222222222';
const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';

function makeRevokedRow(): UserToken {
  return {
    id: TOKEN_ID,
    account_id: ACCOUNT_ID,
    token_name: 'CI deploy token',
    scopes: ['read'],
    expires_at: 9_999_999_999,
    revoked: true,
    revoked_at: '2026-04-16T00:00:00.000Z',
    created_at: '2026-04-15T00:00:00.000Z',
    updated_at: '2026-04-16T00:00:00.000Z',
    created_by: ACCOUNT_ID,
    updated_by: ACCOUNT_ID,
  };
}

describe('RevokeUserTokenService', () => {
  it('returns the updated row when the repository revokes successfully', async () => {
    const repo = new MockUserTokenRepository();
    const updated = makeRevokedRow();
    repo.revokeImpl = async () => updated;

    const service = new RevokeUserTokenService(repo);

    const result = await service.execute({
      id: TOKEN_ID,
      accountId: ACCOUNT_ID,
    });

    expect(result).toBe(updated);
    expect(repo.revokeCalls).toEqual([{ id: TOKEN_ID, accountId: ACCOUNT_ID }]);
  });

  it('throws a USER_TOKEN_NOT_FOUND_ERROR DomainException when the repo returns null', async () => {
    const repo = new MockUserTokenRepository();
    repo.revokeImpl = async () => null;
    const service = new RevokeUserTokenService(repo);

    let caught: unknown;
    try {
      await service.execute({ id: TOKEN_ID, accountId: ACCOUNT_ID });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DomainException);
    const exception = caught as DomainException;
    expect(exception.code).toBe(Code.USER_TOKEN_NOT_FOUND_ERROR.code);
    expect(exception.data).toEqual({ tokenId: TOKEN_ID });
  });

  it('rethrows when the repository itself fails', async () => {
    const repo = new MockUserTokenRepository();
    repo.revokeImpl = async () => {
      throw new Error('postgres down');
    };
    const service = new RevokeUserTokenService(repo);

    await expect(
      service.execute({ id: TOKEN_ID, accountId: ACCOUNT_ID }),
    ).rejects.toThrow('postgres down');
  });
});
