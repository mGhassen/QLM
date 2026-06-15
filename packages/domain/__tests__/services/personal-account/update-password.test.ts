import { describe, expect, it } from 'vitest';

import { Code } from '../../../src/common/code';
import type { PersonalAccount } from '../../../src/entities/personal-account.type';
import { DomainException } from '../../../src/exceptions/domain-exception';
import { invalidCurrentPasswordException } from '../../../src/exceptions/invalid-current-password.exception';
import { IAccountRepository } from '../../../src/repositories/account-repository.port';
import { UpdatePasswordService } from '../../../src/services/personal-account/update-password.usecase';

class MockAccountRepository extends IAccountRepository {
  public updatePasswordCalls: Array<{
    sessionEmail: string;
    current: string;
    next: string;
  }> = [];
  public updatePasswordImpl: (input: {
    sessionEmail: string;
    current: string;
    next: string;
  }) => Promise<void> = async () => {};

  async getMine(): Promise<PersonalAccount | null> {
    throw new Error('not used');
  }
  async updateMine(): Promise<PersonalAccount> {
    throw new Error('not used');
  }
  async uploadAvatar(): Promise<PersonalAccount> {
    throw new Error('not used');
  }
  async clearAvatar(): Promise<PersonalAccount> {
    throw new Error('not used');
  }
  async updatePassword(input: {
    sessionEmail: string;
    current: string;
    next: string;
  }): Promise<void> {
    this.updatePasswordCalls.push(input);
    return this.updatePasswordImpl(input);
  }
}

const SESSION_EMAIL = 'hani@example.com';

describe('UpdatePasswordService', () => {
  it('forwards a valid input to the repository', async () => {
    const repo = new MockAccountRepository();
    const service = new UpdatePasswordService(repo);

    await service.execute({
      sessionEmail: SESSION_EMAIL,
      current: 'old-password',
      next: 'new-password-1234',
    });

    expect(repo.updatePasswordCalls).toEqual([
      {
        sessionEmail: SESSION_EMAIL,
        current: 'old-password',
        next: 'new-password-1234',
      },
    ]);
  });

  it('rejects a next password shorter than 8 chars', async () => {
    const repo = new MockAccountRepository();
    const service = new UpdatePasswordService(repo);

    await expect(
      service.execute({
        sessionEmail: SESSION_EMAIL,
        current: 'old',
        next: 'short',
      }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(repo.updatePasswordCalls).toHaveLength(0);
  });

  it('rejects an empty current password', async () => {
    const repo = new MockAccountRepository();
    const service = new UpdatePasswordService(repo);

    await expect(
      service.execute({
        sessionEmail: SESSION_EMAIL,
        current: '',
        next: 'new-password-1234',
      }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(repo.updatePasswordCalls).toHaveLength(0);
  });

  it('rejects when next equals current', async () => {
    const repo = new MockAccountRepository();
    const service = new UpdatePasswordService(repo);

    try {
      await service.execute({
        sessionEmail: SESSION_EMAIL,
        current: 'identical-password',
        next: 'identical-password',
      });
      expect.fail('expected InvalidProfileInputException');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect((error as DomainException).code).toBe(
        Code.INVALID_PROFILE_INPUT_ERROR.code,
      );
    }
    expect(repo.updatePasswordCalls).toHaveLength(0);
  });

  it('rejects malformed sessionEmail', async () => {
    const repo = new MockAccountRepository();
    const service = new UpdatePasswordService(repo);

    await expect(
      service.execute({
        sessionEmail: 'not-an-email',
        current: 'old',
        next: 'new-password-1234',
      }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(repo.updatePasswordCalls).toHaveLength(0);
  });

  it('propagates InvalidCurrentPasswordException from the adapter', async () => {
    const repo = new MockAccountRepository();
    repo.updatePasswordImpl = async () => {
      throw invalidCurrentPasswordException();
    };
    const service = new UpdatePasswordService(repo);

    try {
      await service.execute({
        sessionEmail: SESSION_EMAIL,
        current: 'wrong',
        next: 'new-password-1234',
      });
      expect.fail('expected InvalidCurrentPasswordException');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect((error as DomainException).code).toBe(
        Code.INVALID_CURRENT_PASSWORD_ERROR.code,
      );
    }
  });
});
