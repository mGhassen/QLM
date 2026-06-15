import { describe, expect, it } from 'vitest';

import { CreateIntegrationConnectionService } from '../../../src/services/integration/create-integration-connection.usecase';
import { MockIntegrationConnectionRepository, MockSecretVault } from './mocks';

const PROJECT_ID = '00000000-0000-4000-8000-000000000000';
const CREATED_BY = '22222222-2222-4222-8222-222222222222';

describe('CreateIntegrationConnectionService', () => {
  it('persists a new AWS integration and stores credentials in the vault', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const service = new CreateIntegrationConnectionService(repository, vault);

    const output = await service.execute({
      projectId: PROJECT_ID,
      name: 'prod-aws',
      credentials: {
        provider: 'aws',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        defaultRegion: 'us-east-1',
      },
      createdBy: CREATED_BY,
    });

    expect(output.provider).toBe('aws');
    expect(output.name).toBe('prod-aws');
    expect(output.config.defaultRegion).toBe('us-east-1');
    expect(output.testStatus).toBe('untested');

    // The sanitised DTO must NOT expose the secret handle.
    expect(output).not.toHaveProperty('secretRef');

    // The row on disk holds the vault handle, not the raw key material.
    const persisted = repository.snapshot(output.id);
    expect(persisted?.secretRef).toMatch(/^vault:integration:aws:/);

    // Raw credentials live ONLY in the vault under the opaque handle.
    const revealed = await vault.reveal(persisted!.secretRef!);
    expect(revealed).toContain('AKIAIOSFODNN7EXAMPLE');
    expect(revealed).toContain('wJalrXUtnFEMI');
  });

  it('extracts the GCP project id from the service account JSON as accountHint', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const service = new CreateIntegrationConnectionService(repository, vault);

    const gcpJson = JSON.stringify({
      type: 'service_account',
      project_id: 'guepard-analytics-prod',
      private_key_id: 'abc',
      private_key:
        '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----',
      client_email: 'guepard@guepard-analytics-prod.iam.gserviceaccount.com',
    });

    const output = await service.execute({
      projectId: PROJECT_ID,
      name: 'analytics',
      credentials: {
        provider: 'gcp',
        serviceAccountJson: gcpJson,
        defaultRegion: 'europe-west1',
      },
      createdBy: CREATED_BY,
    });

    expect(output.provider).toBe('gcp');
    expect(output.config.accountHint).toBe('guepard-analytics-prod');
    expect(output.config.defaultRegion).toBe('europe-west1');
  });

  it('never writes credentials into the row config', async () => {
    const repository = new MockIntegrationConnectionRepository();
    const vault = new MockSecretVault();
    const service = new CreateIntegrationConnectionService(repository, vault);

    const output = await service.execute({
      projectId: PROJECT_ID,
      name: 'prod-aws',
      credentials: {
        provider: 'aws',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        sessionToken: 'token-value',
        defaultRegion: 'us-east-1',
      },
      createdBy: CREATED_BY,
    });

    const persisted = repository.snapshot(output.id);
    expect(persisted?.config).toEqual({ defaultRegion: 'us-east-1' });
    expect(JSON.stringify(persisted?.config)).not.toContain('AKIA');
    expect(JSON.stringify(persisted?.config)).not.toContain('token-value');
  });
});
