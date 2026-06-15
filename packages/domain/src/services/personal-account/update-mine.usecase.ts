import type { PersonalAccount } from '../../entities/personal-account.type';
import { invalidProfileInputException } from '../../exceptions/invalid-profile-input.exception';
import type { IAccountRepository } from '../../repositories/account-repository.port';
import {
  UpdatePersonalAccountInputSchema,
  type UpdatePersonalAccountInput,
} from './dtos';

/**
 * Partial update of the signed-in user's `accounts` row. Validates the
 * patch via Zod and rejects empty patches — the adapter should never be
 * called with nothing to change.
 */
export class UpdatePersonalAccountService {
  constructor(private readonly repository: IAccountRepository) {}

  public async execute(
    input: UpdatePersonalAccountInput,
  ): Promise<PersonalAccount> {
    const parsed = UpdatePersonalAccountInputSchema.safeParse(input);
    if (!parsed.success) {
      throw invalidProfileInputException(
        parsed.error.issues[0]?.message ?? 'validation failed',
      );
    }

    const { userId, name, pictureUrl } = parsed.data;
    const patch: { name?: string; pictureUrl?: string | null } = {};
    if (name !== undefined) patch.name = name;
    if (pictureUrl !== undefined) patch.pictureUrl = pictureUrl;

    if (Object.keys(patch).length === 0) {
      throw invalidProfileInputException('patch is empty');
    }

    return this.repository.updateMine(userId, patch);
  }
}
