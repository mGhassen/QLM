import { plainToClass } from 'class-transformer';

import { IntegrationConnectionOutput } from '@guepard/domain/usecases';

/**
 * A fully-populated GCP integration in its happy-path "connected" state.
 */
export const gcpIntegrationFixture = plainToClass(IntegrationConnectionOutput, {
  id: '33333333-3333-4333-8333-333333333333',
  projectId: '00000000-0000-4000-8000-000000000000',
  provider: 'gcp',
  name: 'analytics',
  slug: 'analytics',
  config: {
    defaultRegion: 'europe-west1',
    accountHint: 'guepard-analytics-prod',
  },
  testStatus: 'success',
  testIdentity:
    'guepard-runtime@guepard-analytics-prod.iam.gserviceaccount.com',
  testError: null,
  testedAt: new Date('2026-04-11T09:45:00.000Z'),
  createdAt: new Date('2026-04-10T14:20:00.000Z'),
  updatedAt: new Date('2026-04-11T09:45:00.000Z'),
  createdBy: '22222222-2222-4222-8222-222222222222',
});
