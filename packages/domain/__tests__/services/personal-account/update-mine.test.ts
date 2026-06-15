import { describe, expect, it } from 'vitest';

import { Code } from '../../../src/common/code';
import type { PersonalAccount } from '../../../src/entities/personal-account.type';
import { DomainException } from '../../../src/exceptions/domain-exception';
import { IAccountRepository } from '../../../src/repositories/account-repository.port';
import { UpdatePersonalAccountService } from '../../../src/services/personal-account/update-mine.usecase';

class MockAccountRepository extends IAccountRepository {
  public updateCalls: Array<{
    userId: string;
    patch: { name?: string; pictureUrl?: string | null };
  }> = [];

  async getMine(): Promise<PersonalAccount | null> {
    throw new Error('not used');
  }
  async updateMine(
    userId: string,
    patch: { name?: string; pictureUrl?: string | null },
  ): Promise<PersonalAccount> {
    this.updateCalls.push({ userId, patch });
    return {
      id: '11111111-1111-4111-8111-111111111111',
      userId,
      name: patch.name ?? 'unchanged',
      email: null,
      pictureUrl: patch.pictureUrl ?? null,
      updatedAt: new Date().toISOString(),
    };
  }
}

const USER_ID = '00000000-0000-4000-8000-000000000001';

describe('UpdatePersonalAccountService', () => {
  it('forwards a valid name patch to the repository', async () => {
    const repo = new MockAccountRepository();
    const service = new UpdatePersonalAccountService(repo);

    const result = await service.execute({ userId: USER_ID, name: 'Hani' });

    expect(repo.updateCalls).toEqual([
      { userId: USER_ID, patch: { name: 'Hani' } },
    ]);
    expect(result.name).toBe('Hani');
  });

  it('trims the name before forwarding', async () => {
    const repo = new MockAccountRepository();
    const service = new UpdatePersonalAccountService(repo);

    await service.execute({ userId: USER_ID, name: '  Hani  ' });

    expect(repo.updateCalls[0]?.patch.name).toBe('Hani');
  });

  it('rejects an empty-string name with InvalidProfileInputException', async () => {
    const repo = new MockAccountRepository();
    const service = new UpdatePersonalAccountService(repo);

    await expect(
      service.execute({ userId: USER_ID, name: '' }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(repo.updateCalls).toHaveLength(0);
  });

  it('rejects a whitespace-only name', async () => {
    const repo = new MockAccountRepository();
    const service = new UpdatePersonalAccountService(repo);

    await expect(
      service.execute({ userId: USER_ID, name: '   ' }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(repo.updateCalls).toHaveLength(0);
  });

  it('rejects an empty patch (no keys)', async () => {
    const repo = new MockAccountRepository();
    const service = new UpdatePersonalAccountService(repo);

    try {
      await service.execute({ userId: USER_ID });
      expect.fail('expected InvalidProfileInputException');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect((error as DomainException).code).toBe(
        Code.INVALID_PROFILE_INPUT_ERROR.code,
      );
    }
    expect(repo.updateCalls).toHaveLength(0);
  });

  it('forwards a pictureUrl patch independently', async () => {
    const repo = new MockAccountRepository();
    const service = new UpdatePersonalAccountService(repo);

    await service.execute({
      userId: USER_ID,
      pictureUrl: 'https://example.com/avatar.png',
    });

    expect(repo.updateCalls[0]?.patch).toEqual({
      pictureUrl: 'https://example.com/avatar.png',
    });
  });

  it('allows clearing the avatar via pictureUrl: null', async () => {
    const repo = new MockAccountRepository();
    const service = new UpdatePersonalAccountService(repo);

    await service.execute({ userId: USER_ID, pictureUrl: null });

    expect(repo.updateCalls[0]?.patch).toEqual({ pictureUrl: null });
  });
});
