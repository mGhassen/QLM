import { invalidProfileInputException } from '../../exceptions/invalid-profile-input.exception';
import type { IMfaRepository } from '../../repositories/mfa-repository.port';
import {
  UnenrollMfaFactorInputSchema,
  type UnenrollMfaFactorInput,
} from './dtos';

/**
 * Remove a registered MFA factor. The caller is responsible for the
 * re-auth gate (see port JSDoc).
 */
export class UnenrollFactorService {
  constructor(private readonly repository: IMfaRepository) {}

  public async execute(input: UnenrollMfaFactorInput): Promise<void> {
    const parsed = UnenrollMfaFactorInputSchema.safeParse(input);
    if (!parsed.success) {
      throw invalidProfileInputException(
        parsed.error.issues[0]?.message ?? 'invalid factor id',
      );
    }
    await this.repository.unenroll(parsed.data.factorId);
  }
}
