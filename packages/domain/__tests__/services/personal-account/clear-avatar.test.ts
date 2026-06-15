import { describe, expect, it } from 'vitest';

import type { PersonalAccount } from '../../../src/entities/personal-account.type';
import { DomainException } from '../../../src/exceptions/domain-exception';
import { IAccountRepository } from '../../../src/repositories/account-repository.port';
import { ClearAvatarService } from '../../../src/services/personal-account/clear-avatar.usecase';

class MockAccountRepository extends IAccountRepository {
  public clearCalls: string[] = [];

  async getMine(): Promise<PersonalAccount | null> {
    throw new Error('not used');
  }
  async updateMine(): Promise<PersonalAccount> {
    throw new Error('not used');
  }
  async uploadAvatar(): Promise<PersonalAccount> {
    throw new Error('not used');
  }
  async clearAvatar(userId: string): Promise<PersonalAccount> {
    this.clearCalls.push(userId);
    return {
      id: '11111111-1111-4111-8111-111111111111',
      userId,
      name: 'Hani',
      email: null,
      pictureUrl: null,
      updatedAt: new Date().toISOString(),
    };
  }
}

const USER_ID = '00000000-0000-4000-8000-000000000001';

describe('ClearAvatarService', () => {
  it('forwards the userId and returns the cleared row', async () => {
    const repo = new MockAccountRepository();
    const service = new ClearAvatarService(repo);

    const result = await service.execute({ userId: USER_ID });

    expect(repo.clearCalls).toEqual([USER_ID]);
    expect(result.pictureUrl).toBeNull();
  });

  it('rejects malformed userId', async () => {
    const repo = new MockAccountRepository();
    const service = new ClearAvatarService(repo);

    await expect(
      service.execute({ userId: 'not-a-uuid' }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(repo.clearCalls).toHaveLength(0);
  });
});
