import { describe, expect, it } from 'vitest';

import { DomainException } from '../../../src/exceptions';
import { ListProviderRegionsService } from '../../../src/services/integration/list-provider-regions.usecase';
import {
  MockIntegrationConnectionRepository,
  MockSecretVault,
  createDefaultRegistry,
  createIntegrationRow,
} from './mocks';

describe('ListProviderRegionsService', () => {
  it('returns regions reported by the driver and does not persist them', async () => {
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
    aws.nextRegions = [
      { id: 'us-east-1', name: 'US East (N. Virginia)' },
      { id: 'eu-west-1', name: 'Europe (Ireland)' },
    ];
    const service = new ListProviderRegionsService(repository, vault, registry);

    const regions = await service.execute(row.id);

    expect(regions).toHaveLength(2);
    expect(regions[0]).toEqual({
      id: 'us-east-1',
      name: 'US East (N. Virginia)',
    });
    expect(aws.listRegionsCalls).toHaveLength(1);

    // Regions are never written back to the row.
    const after = repository.snapshot(row.id);
    expect(after?.testStatus).toBe(row.testStatus);
    expect(after?.testedAt).toEqual(row.testedAt);
  });

  it('throws INTEGRATION_NOT_FOUND when the id is unknown', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const { registry } = createDefaultRegistry();
    const service = new ListProviderRegionsService(repository, vault, registry);

    await expect(service.execute('missing-id')).rejects.toThrow(
      DomainException,
    );
  });

  it('throws when the row has no secret attached', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const row = createIntegrationRow({ secretRef: null });
    repository.seed(row);
    const { registry } = createDefaultRegistry();
    const service = new ListProviderRegionsService(repository, vault, registry);

    await expect(service.execute(row.id)).rejects.toThrow(/no credentials/);
  });
});
