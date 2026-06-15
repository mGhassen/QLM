import { describe, expect, it } from 'vitest';

import type { PersonalAccount } from '../../../src/entities/personal-account.type';
import { IAccountRepository } from '../../../src/repositories/account-repository.port';
import { GetPersonalAccountService } from '../../../src/services/personal-account/get-mine.usecase';

class MockAccountRepository extends IAccountRepository {
  public constructor(private readonly row: PersonalAccount | null) {
    super();
  }

  async getMine(): Promise<PersonalAccount | null> {
    return this.row;
  }
  async updateMine(): Promise<PersonalAccount> {
    throw new Error('not used');
  }
}

const USER_ID = '00000000-0000-4000-8000-000000000001';
const ACCOUNT: PersonalAccount = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: USER_ID,
  name: 'Hani Chalouati',
  email: 'hani@example.com',
  pictureUrl: null,
  updatedAt: new Date().toISOString(),
};

describe('GetPersonalAccountService', () => {
  it('returns the row when the account exists', async () => {
    const service = new GetPersonalAccountService(
      new MockAccountRepository(ACCOUNT),
    );

    const result = await service.execute({ userId: USER_ID });

    expect(result).toEqual(ACCOUNT);
  });

  it('returns null when the trigger-inserted row is not visible yet', async () => {
    const service = new GetPersonalAccountService(
      new MockAccountRepository(null),
    );

    const result = await service.execute({ userId: USER_ID });

    expect(result).toBeNull();
  });
});
