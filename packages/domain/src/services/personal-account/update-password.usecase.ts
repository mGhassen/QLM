import { invalidProfileInputException } from '../../exceptions/invalid-profile-input.exception';
import type { IAccountRepository } from '../../repositories/account-repository.port';
import { UpdatePasswordInputSchema, type UpdatePasswordInput } from './dtos';

/**
 * Updates the signed-in user's auth password. Re-auth happens inside the
 * adapter (it owns the `signInWithPassword` call); this service just
 * validates the input and forwards.
 */
export class UpdatePasswordService {
  constructor(private readonly repository: IAccountRepository) {}

  public async execute(input: UpdatePasswordInput): Promise<void> {
    const parsed = UpdatePasswordInputSchema.safeParse(input);
    if (!parsed.success) {
      throw invalidProfileInputException(
        parsed.error.issues[0]?.message ?? 'invalid password input',
      );
    }

    await this.repository.updatePassword(parsed.data);
  }
}
