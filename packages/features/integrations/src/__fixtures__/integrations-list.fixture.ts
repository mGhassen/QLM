import { plainToClass } from 'class-transformer';

import { IntegrationConnectionOutput } from '@qlm/domain/usecases';

import { awsIntegrationFixture } from './aws-integration.fixture';
import { gcpIntegrationFixture } from './gcp-integration.fixture';

/**
 * A failed GCP integration — complements the two "success" fixtures so the
 * list-view story can show all three `testStatus` values at once.
 */
const failedGcpIntegration = plainToClass(IntegrationConnectionOutput, {
  id: '44444444-4444-4444-8444-444444444444',
  projectId: '00000000-0000-4000-8000-000000000000',
  provider: 'gcp',
  name: 'legacy-warehouse',
  slug: 'legacy-warehouse',
  config: {
    defaultRegion: 'us-central1',
    accountHint: 'legacy-warehouse-prod',
  },
  testStatus: 'failed',
  testIdentity: null,
  testError:
    'The service account does not have compute.regions.list permission.',
  testedAt: new Date('2026-04-11T08:12:00.000Z'),
  createdAt: new Date('2026-03-02T11:00:00.000Z'),
  updatedAt: new Date('2026-04-11T08:12:00.000Z'),
  createdBy: '22222222-2222-4222-8222-222222222222',
});

/**
 * An untested AWS integration — freshly created, never exercised.
 */
const untestedAwsIntegration = plainToClass(IntegrationConnectionOutput, {
  id: '55555555-5555-4555-8555-555555555555',
  projectId: '00000000-0000-4000-8000-000000000000',
  provider: 'aws',
  name: 'staging',
  slug: 'staging',
  config: {
    defaultRegion: 'us-west-2',
    accountHint: '987654321098',
  },
  testStatus: 'untested',
  testIdentity: null,
  testError: null,
  testedAt: null,
  createdAt: new Date('2026-04-11T11:15:00.000Z'),
  updatedAt: new Date('2026-04-11T11:15:00.000Z'),
  createdBy: '22222222-2222-4222-8222-222222222222',
});

/**
 * A populated list containing at least one of each test status. Drives the
 * "Populated" story on IntegrationsUI and IntegrationsTable.
 */
export const integrationsListFixture: IntegrationConnectionOutput[] = [
  awsIntegrationFixture,
  gcpIntegrationFixture,
  failedGcpIntegration,
  untestedAwsIntegration,
];
