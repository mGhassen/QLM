import type { PersonalAccount } from '../../entities/personal-account.type';
import type { IAccountRepository } from '../../repositories/account-repository.port';

/**
 * Returns the personal account for the signed-in user, or `null` if the
 * auth-trigger-inserted row is not yet visible. Pass-through to the port
 * for layering consistency.
 */
export class GetPersonalAccountService {
  constructor(private readonly repository: IAccountRepository) {}

  public execute(input: { userId: string }): Promise<PersonalAccount | null> {
    return this.repository.getMine(input.userId);
  }
}
