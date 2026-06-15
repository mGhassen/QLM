import { describe, expect, it } from 'vitest';

import type {
  EnrollTotpOutput,
  MfaFactor,
} from '../../../src/entities/mfa-factor.type';
import { DomainException } from '../../../src/exceptions/domain-exception';
import { IMfaRepository } from '../../../src/repositories/mfa-repository.port';
import { VerifyMfaFactorService } from '../../../src/services/mfa/verify-factor.usecase';

class MockMfaRepository extends IMfaRepository {
  public verifyCalls: Array<{
    factorId: string;
    challengeId: string;
    code: string;
  }> = [];
  public verifyImpl: (input: {
    factorId: string;
    challengeId: string;
    code: string;
  }) => Promise<void> = async () => {};

  async listFactors(): Promise<MfaFactor[]> {
    throw new Error('not used');
  }
  async enrollTotp(): Promise<EnrollTotpOutput> {
    throw new Error('not used');
  }
  async challenge(): Promise<{ challengeId: string }> {
    throw new Error('not used');
  }
  async verify(input: {
    factorId: string;
    challengeId: string;
    code: string;
  }): Promise<void> {
    this.verifyCalls.push(input);
    return this.verifyImpl(input);
  }
  async unenroll(): Promise<void> {
    throw new Error('not used');
  }
}

const FACTOR_ID = '11111111-1111-4111-8111-111111111111';
const CHALLENGE_ID = '22222222-2222-4222-8222-222222222222';

describe('VerifyMfaFactorService', () => {
  it('forwards a valid input to the repository', async () => {
    const repo = new MockMfaRepository();
    const service = new VerifyMfaFactorService(repo);

    await service.execute({
      factorId: FACTOR_ID,
      challengeId: CHALLENGE_ID,
      code: '123456',
    });

    expect(repo.verifyCalls).toEqual([
      { factorId: FACTOR_ID, challengeId: CHALLENGE_ID, code: '123456' },
    ]);
  });

  it('rejects a non-6-digit code', async () => {
    const repo = new MockMfaRepository();
    const service = new VerifyMfaFactorService(repo);

    await expect(
      service.execute({
        factorId: FACTOR_ID,
        challengeId: CHALLENGE_ID,
        code: '12345',
      }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(repo.verifyCalls).toHaveLength(0);
  });

  it('rejects a non-numeric code', async () => {
    const repo = new MockMfaRepository();
    const service = new VerifyMfaFactorService(repo);

    await expect(
      service.execute({
        factorId: FACTOR_ID,
        challengeId: CHALLENGE_ID,
        code: '12345a',
      }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(repo.verifyCalls).toHaveLength(0);
  });

  it('propagates adapter errors verbatim', async () => {
    const repo = new MockMfaRepository();
    repo.verifyImpl = async () => {
      throw new Error('Invalid TOTP code.');
    };
    const service = new VerifyMfaFactorService(repo);

    await expect(
      service.execute({
        factorId: FACTOR_ID,
        challengeId: CHALLENGE_ID,
        code: '999999',
      }),
    ).rejects.toThrow(/invalid totp code/i);
  });
});
