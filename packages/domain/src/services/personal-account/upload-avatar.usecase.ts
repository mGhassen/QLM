import type { PersonalAccount } from '../../entities/personal-account.type';
import { invalidProfileInputException } from '../../exceptions/invalid-profile-input.exception';
import type { IAccountRepository } from '../../repositories/account-repository.port';
import { UploadAvatarInputSchema, type UploadAvatarInput } from './dtos';

/**
 * Validates the avatar input (UUID, extension whitelist, non-empty bytes)
 * and forwards to the adapter, which handles the actual storage upload
 * and the `accounts.picture_url` write. The adapter is the only place
 * that knows about Supabase Storage — the service stays pure.
 */
export class UploadAvatarService {
  constructor(private readonly repository: IAccountRepository) {}

  public async execute(input: UploadAvatarInput): Promise<PersonalAccount> {
    const parsed = UploadAvatarInputSchema.safeParse(input);
    if (!parsed.success) {
      throw invalidProfileInputException(
        parsed.error.issues[0]?.message ?? 'invalid avatar input',
      );
    }

    if (parsed.data.bytes.byteLength === 0) {
      throw invalidProfileInputException('avatar bytes are empty');
    }

    return this.repository.uploadAvatar(parsed.data);
  }
}
