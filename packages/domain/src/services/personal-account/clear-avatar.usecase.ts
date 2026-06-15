import type { PersonalAccount } from '../../entities/personal-account.type';
import { invalidProfileInputException } from '../../exceptions/invalid-profile-input.exception';
import type { IAccountRepository } from '../../repositories/account-repository.port';
import { ClearAvatarInputSchema, type ClearAvatarInput } from './dtos';

/**
 * Removes the avatar (storage object + `picture_url`) for the signed-in
 * user. Idempotent: clearing a non-existent avatar still updates the row
 * with `picture_url = null`.
 */
export class ClearAvatarService {
  constructor(private readonly repository: IAccountRepository) {}

  public async execute(input: ClearAvatarInput): Promise<PersonalAccount> {
    const parsed = ClearAvatarInputSchema.safeParse(input);
    if (!parsed.success) {
      throw invalidProfileInputException(
        parsed.error.issues[0]?.message ?? 'invalid clear-avatar input',
      );
    }

    return this.repository.clearAvatar(parsed.data.userId);
  }
}
