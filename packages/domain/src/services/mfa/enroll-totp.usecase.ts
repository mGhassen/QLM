import type { EnrollTotpOutput } from '../../entities/mfa-factor.type';
import { invalidProfileInputException } from '../../exceptions/invalid-profile-input.exception';
import type { IMfaRepository } from '../../repositories/mfa-repository.port';
import { EnrollTotpInputSchema, type EnrollTotpInput } from './dtos';

/**
 * Begin TOTP enrollment. The returned QR code + secret must be displayed
 * once and never persisted client-side. The factor is unverified until
 * `VerifyMfaFactorService` runs.
 */
export class EnrollTotpService {
  constructor(private readonly repository: IMfaRepository) {}

  public async execute(input: EnrollTotpInput): Promise<EnrollTotpOutput> {
    const parsed = EnrollTotpInputSchema.safeParse(input);
    if (!parsed.success) {
      throw invalidProfileInputException(
        parsed.error.issues[0]?.message ?? 'invalid factor name',
      );
    }
    return this.repository.enrollTotp(parsed.data.friendlyName);
  }
}
