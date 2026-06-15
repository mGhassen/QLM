import { describe, expect, it } from 'vitest';

import type {
  EnrollTotpOutput,
  MfaFactor,
} from '../../../src/entities/mfa-factor.type';
import { DomainException } from '../../../src/exceptions/domain-exception';
import { IMfaRepository } from '../../../src/repositories/mfa-repository.port';
import { EnrollTotpService } from '../../../src/services/mfa/enroll-totp.usecase';

class MockMfaRepository extends IMfaRepository {
  public enrollCalls: string[] = [];
  public enrollImpl: (friendlyName: string) => Promise<EnrollTotpOutput> =
    async (friendlyName) => ({
      id: '11111111-1111-4111-8111-111111111111',
      totp: {
        qrCode: 'data:image/svg+xml;utf-8,<svg/>',
        secret: 'JBSWY3DPEHPK3PXP',
        uri: `otpauth://totp/Guepard:${friendlyName}?secret=JBSWY3DPEHPK3PXP`,
      },
    });

  async listFactors(): Promise<MfaFactor[]> {
    throw new Error('not used');
  }
  async enrollTotp(friendlyName: string): Promise<EnrollTotpOutput> {
    this.enrollCalls.push(friendlyName);
    return this.enrollImpl(friendlyName);
  }
  async challenge(): Promise<{ challengeId: string }> {
    throw new Error('not used');
  }
  async verify(): Promise<void> {
    throw new Error('not used');
  }
  async unenroll(): Promise<void> {
    throw new Error('not used');
  }
}

describe('EnrollTotpService', () => {
  it('forwards a valid friendly name and returns the enrollment payload', async () => {
    const repo = new MockMfaRepository();
    const service = new EnrollTotpService(repo);

    const result = await service.execute({ friendlyName: 'iPhone' });

    expect(repo.enrollCalls).toEqual(['iPhone']);
    expect(result.id).toBeTypeOf('string');
    expect(result.totp.qrCode).toMatch(/^data:/);
  });

  it('trims the friendly name before forwarding', async () => {
    const repo = new MockMfaRepository();
    const service = new EnrollTotpService(repo);

    await service.execute({ friendlyName: '  Backup laptop  ' });

    expect(repo.enrollCalls[0]).toBe('Backup laptop');
  });

  it('rejects an empty friendly name', async () => {
    const repo = new MockMfaRepository();
    const service = new EnrollTotpService(repo);

    await expect(service.execute({ friendlyName: '' })).rejects.toBeInstanceOf(
      DomainException,
    );
    expect(repo.enrollCalls).toHaveLength(0);
  });

  it('rejects a whitespace-only friendly name', async () => {
    const repo = new MockMfaRepository();
    const service = new EnrollTotpService(repo);

    await expect(
      service.execute({ friendlyName: '   ' }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(repo.enrollCalls).toHaveLength(0);
  });
});
