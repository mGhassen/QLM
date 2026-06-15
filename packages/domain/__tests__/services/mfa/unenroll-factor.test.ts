import { describe, expect, it } from 'vitest';

import type {
  EnrollTotpOutput,
  MfaFactor,
} from '../../../src/entities/mfa-factor.type';
import { DomainException } from '../../../src/exceptions/domain-exception';
import { IMfaRepository } from '../../../src/repositories/mfa-repository.port';
import { UnenrollFactorService } from '../../../src/services/mfa/unenroll-factor.usecase';

class MockMfaRepository extends IMfaRepository {
  public unenrollCalls: string[] = [];

  async listFactors(): Promise<MfaFactor[]> {
    throw new Error('not used');
  }
  async enrollTotp(): Promise<EnrollTotpOutput> {
    throw new Error('not used');
  }
  async challenge(): Promise<{ challengeId: string }> {
    throw new Error('not used');
  }
  async verify(): Promise<void> {
    throw new Error('not used');
  }
  async unenroll(factorId: string): Promise<void> {
    this.unenrollCalls.push(factorId);
  }
}

const FACTOR_ID = '11111111-1111-4111-8111-111111111111';

describe('UnenrollFactorService', () => {
  it('forwards a valid factor id', async () => {
    const repo = new MockMfaRepository();
    const service = new UnenrollFactorService(repo);

    await service.execute({ factorId: FACTOR_ID });

    expect(repo.unenrollCalls).toEqual([FACTOR_ID]);
  });

  it('rejects a malformed factor id', async () => {
    const repo = new MockMfaRepository();
    const service = new UnenrollFactorService(repo);

    await expect(
      service.execute({ factorId: 'not-a-uuid' }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(repo.unenrollCalls).toHaveLength(0);
  });
});
