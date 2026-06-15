import { describe, expect, it } from 'vitest';

import { DomainException } from '../../../src/exceptions';
import { UpdateIntegrationConnectionService } from '../../../src/services/integration/update-integration-connection.usecase';
import {
  MockIntegrationConnectionRepository,
  createIntegrationRow,
} from './mocks';

const UPDATED_BY = '33333333-3333-4333-8333-333333333333';

describe('UpdateIntegrationConnectionService', () => {
  it('renames an existing integration', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const row = createIntegrationRow({ name: 'old-name' });
    repository.seed(row);
    const service = new UpdateIntegrationConnectionService(repository);

    const output = await service.execute({
      id: row.id,
      name: 'new-name',
      updatedBy: UPDATED_BY,
    });

    expect(output.name).toBe('new-name');
    expect(repository.snapshot(row.id)?.name).toBe('new-name');
    expect(repository.snapshot(row.id)?.updatedBy).toBe(UPDATED_BY);
  });

  it('throws INTEGRATION_NOT_FOUND when the id does not exist', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const service = new UpdateIntegrationConnectionService(repository);

    await expect(
      service.execute({ id: 'missing-id', name: 'x', updatedBy: UPDATED_BY }),
    ).rejects.toThrow(DomainException);
    await expect(
      service.execute({ id: 'missing-id', name: 'x', updatedBy: UPDATED_BY }),
    ).rejects.toThrow(/not found/);
  });

  it('does not mutate the credentials or test status', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const row = createIntegrationRow({
      secretRef: 'vault:original:1',
      testStatus: 'success',
      testIdentity: 'arn:aws:iam::123:user/guepard',
    });
    repository.seed(row);
    const service = new UpdateIntegrationConnectionService(repository);

    await service.execute({
      id: row.id,
      name: 'renamed',
      updatedBy: UPDATED_BY,
    });

    const after = repository.snapshot(row.id);
    expect(after?.secretRef).toBe('vault:original:1');
    expect(after?.testStatus).toBe('success');
    expect(after?.testIdentity).toBe('arn:aws:iam::123:user/guepard');
  });
});
