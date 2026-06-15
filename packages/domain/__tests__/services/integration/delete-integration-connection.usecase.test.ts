import { describe, expect, it } from 'vitest';

import { DomainException } from '../../../src/exceptions';
import { DeleteIntegrationConnectionService } from '../../../src/services/integration/delete-integration-connection.usecase';
import {
  MockIntegrationConnectionRepository,
  MockSecretVault,
  createIntegrationRow,
} from './mocks';

describe('DeleteIntegrationConnectionService', () => {
  it('deletes the row and forgets the vault handle', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const secretRef = await vault.protect('{"provider":"aws"}', {
      keyName: 'integration:aws:test',
    });
    const row = createIntegrationRow({ secretRef });
    repository.seed(row);
    const service = new DeleteIntegrationConnectionService(repository, vault);

    const result = await service.execute(row.id);

    expect(result).toBe(true);
    expect(repository.snapshot(row.id)).toBeUndefined();
    expect(vault.forgotten).toContain(secretRef);
  });

  it('throws INTEGRATION_NOT_FOUND when the id does not exist', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const service = new DeleteIntegrationConnectionService(repository, vault);

    await expect(service.execute('missing-id')).rejects.toThrow(
      DomainException,
    );
    await expect(service.execute('missing-id')).rejects.toThrow(/not found/);
  });

  it('does not delete sibling integrations', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const other = createIntegrationRow({
      id: '99999999-9999-4999-8999-999999999999',
      slug: 'staging',
      name: 'staging',
    });
    const row = createIntegrationRow();
    repository.seed(row);
    repository.seed(other);
    const service = new DeleteIntegrationConnectionService(repository, vault);

    await service.execute(row.id);

    expect(repository.snapshot(row.id)).toBeUndefined();
    expect(repository.snapshot(other.id)).toBeDefined();
  });
});
