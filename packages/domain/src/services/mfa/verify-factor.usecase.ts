import { invalidProfileInputException } from '../../exceptions/invalid-profile-input.exception';
import type { IMfaRepository } from '../../repositories/mfa-repository.port';
import { VerifyMfaFactorInputSchema, type VerifyMfaFactorInput } from './dtos';

/**
 * Verify a TOTP code against an issued challenge. Wrong codes are
 * surfaced by the adapter as a generic error — do not differentiate at
 * the service level (would leak factor-validity timing).
 */
export class VerifyMfaFactorService {
  constructor(private readonly repository: IMfaRepository) {}

  public async execute(input: VerifyMfaFactorInput): Promise<void> {
    const parsed = VerifyMfaFactorInputSchema.safeParse(input);
    if (!parsed.success) {
      throw invalidProfileInputException(
        parsed.error.issues[0]?.message ?? 'invalid verify input',
      );
    }
    await this.repository.verify(parsed.data);
  }
}
