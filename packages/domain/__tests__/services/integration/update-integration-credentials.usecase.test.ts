import { describe, expect, it } from 'vitest';

import { DomainException } from '../../../src/exceptions';
import { UpdateIntegrationCredentialsService } from '../../../src/services/integration/update-integration-credentials.usecase';
import {
  MockIntegrationConnectionRepository,
  MockSecretVault,
  createIntegrationRow,
} from './mocks';

const UPDATED_BY = '33333333-3333-4333-8333-333333333333';

describe('UpdateIntegrationCredentialsService', () => {
  it('re-protects new credentials and resets the test state', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const oldRef = await vault.protect(
      JSON.stringify({
        provider: 'aws',
        accessKeyId: 'AKIAOLD',
        secretAccessKey: 'old-secret',
      }),
      { keyName: 'integration:aws:test' },
    );
    const row = createIntegrationRow({
      secretRef: oldRef,
      testStatus: 'success',
      testIdentity: 'arn:aws:iam::123:user/old',
      testError: null,
      testedAt: new Date('2026-04-10T00:00:00.000Z'),
    });
    repository.seed(row);
    const service = new UpdateIntegrationCredentialsService(repository, vault);

    const output = await service.execute({
      id: row.id,
      credentials: {
        provider: 'aws',
        accessKeyId: 'AKIANEWEXAMPLE00001A',
        secretAccessKey: 'new-secret-value',
        defaultRegion: 'us-east-1',
      },
      updatedBy: UPDATED_BY,
    });

    expect(output.testStatus).toBe('untested');
    expect(output.testIdentity).toBeNull();
    expect(output.testError).toBeNull();
    expect(output.testedAt).toBeNull();

    // New handle is distinct from the old one and points at the new blob.
    const newRef = repository.snapshot(row.id)?.secretRef;
    expect(newRef).toBeTruthy();
    expect(newRef).not.toBe(oldRef);
    expect(await vault.reveal(newRef!)).toContain('AKIANEWEXAMPLE');
  });

  it('best-effort forgets the old handle after rotation', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const oldRef = await vault.protect('{"provider":"aws"}', {
      keyName: 'integration:aws:test',
    });
    const row = createIntegrationRow({ secretRef: oldRef });
    repository.seed(row);
    const service = new UpdateIntegrationCredentialsService(repository, vault);

    await service.execute({
      id: row.id,
      credentials: {
        provider: 'aws',
        accessKeyId: 'AKIANEWEXAMPLE00001A',
        secretAccessKey: 'new-secret',
        defaultRegion: 'us-east-1',
      },
      updatedBy: UPDATED_BY,
    });

    expect(vault.forgotten).toContain(oldRef);
  });

  it('throws INTEGRATION_NOT_FOUND when the id does not exist', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const service = new UpdateIntegrationCredentialsService(repository, vault);

    await expect(
      service.execute({
        id: 'missing-id',
        credentials: {
          provider: 'aws',
          accessKeyId: 'AKIANEWEXAMPLE00001A',
          secretAccessKey: 'new-secret',
          defaultRegion: 'us-east-1',
        },
        updatedBy: UPDATED_BY,
      }),
    ).rejects.toThrow(DomainException);
  });

  it('refuses to rotate with credentials from the wrong provider', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const row = createIntegrationRow({ provider: 'aws' });
    repository.seed(row);
    const service = new UpdateIntegrationCredentialsService(repository, vault);

    await expect(
      service.execute({
        id: row.id,
        credentials: {
          provider: 'gcp',
          serviceAccountJson: '{}',
          defaultRegion: 'europe-west1',
        },
        updatedBy: UPDATED_BY,
      }),
    ).rejects.toThrow(/Cannot rotate/);
  });
});
