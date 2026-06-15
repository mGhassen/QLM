import { describe, expect, it } from 'vitest';

import { DomainException } from '../../../src/exceptions';
import { TestIntegrationConnectionService } from '../../../src/services/integration/test-integration-connection.usecase';
import {
  MockIntegrationConnectionRepository,
  MockSecretVault,
  createDefaultRegistry,
  createIntegrationRow,
} from './mocks';

describe('TestIntegrationConnectionService', () => {
  it('reveals credentials, calls the provider driver, and persists success', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const secretRef = await vault.protect(
      JSON.stringify({
        provider: 'aws',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI',
      }),
      { keyName: 'integration:aws:test' },
    );
    const row = createIntegrationRow({ secretRef });
    repository.seed(row);
    const { registry, aws } = createDefaultRegistry();
    aws.nextResult = {
      ok: true,
      identity: 'arn:aws:iam::123456789012:user/guepard',
    };
    const service = new TestIntegrationConnectionService(
      repository,
      vault,
      registry,
    );

    const result = await service.execute(row.id);

    expect(result.ok).toBe(true);
    expect(result.identity).toBe('arn:aws:iam::123456789012:user/guepard');

    expect(aws.testCalls).toHaveLength(1);
    const callArg = aws.testCalls[0];
    expect(callArg?.provider).toBe('aws');
    if (callArg?.provider === 'aws') {
      expect(callArg.accessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
      expect(callArg.defaultRegion).toBe('us-east-1');
    }

    const after = repository.snapshot(row.id);
    expect(after?.testStatus).toBe('success');
    expect(after?.testIdentity).toBe('arn:aws:iam::123456789012:user/guepard');
    expect(after?.testError).toBeNull();
    expect(after?.testedAt).toBeInstanceOf(Date);
  });

  it('persists failure with the provider error message', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const secretRef = await vault.protect(
      JSON.stringify({
        provider: 'aws',
        accessKeyId: 'AKIABAD',
        secretAccessKey: 'bad',
      }),
      { keyName: 'integration:aws:test' },
    );
    const row = createIntegrationRow({ secretRef });
    repository.seed(row);
    const { registry, aws } = createDefaultRegistry();
    aws.nextResult = {
      ok: false,
      errorCode: 'invalid_credentials',
      errorMessage: 'The security token included in the request is invalid.',
    };
    const service = new TestIntegrationConnectionService(
      repository,
      vault,
      registry,
    );

    const result = await service.execute(row.id);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('invalid_credentials');

    const after = repository.snapshot(row.id);
    expect(after?.testStatus).toBe('failed');
    expect(after?.testIdentity).toBeNull();
    expect(after?.testError).toContain('security token');
  });

  it('throws INTEGRATION_NOT_FOUND when the id is unknown', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const { registry } = createDefaultRegistry();
    const service = new TestIntegrationConnectionService(
      repository,
      vault,
      registry,
    );

    await expect(service.execute('missing-id')).rejects.toThrow(
      DomainException,
    );
    await expect(service.execute('missing-id')).rejects.toThrow(/not found/);
  });

  it('throws INTEGRATION_VALIDATION_ERROR when the row has no secret attached', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const row = createIntegrationRow({ secretRef: null });
    repository.seed(row);
    const { registry } = createDefaultRegistry();
    const service = new TestIntegrationConnectionService(
      repository,
      vault,
      registry,
    );

    await expect(service.execute(row.id)).rejects.toThrow(/no credentials/);
  });
});
