import { plainToClass } from 'class-transformer';

import { IntegrationConnectionOutput } from '@qlm/domain/usecases';

/**
 * A fully-populated AWS integration in its happy-path "connected" state.
 *
 * Used by stories that want to render the list/detail with a plausible
 * successful row. Typed against the domain DTO so a schema change in
 * packages/domain fails compilation here too.
 */
export const awsIntegrationFixture = plainToClass(IntegrationConnectionOutput, {
  id: '11111111-1111-4111-8111-111111111111',
  projectId: '00000000-0000-4000-8000-000000000000',
  provider: 'aws',
  name: 'prod-aws',
  slug: 'prod-aws',
  config: {
    defaultRegion: 'us-east-1',
    accountHint: '123456789012',
  },
  testStatus: 'success',
  testIdentity: 'arn:aws:iam::123456789012:user/qlm',
  testError: null,
  testedAt: new Date('2026-04-11T10:58:00.000Z'),
  createdAt: new Date('2026-04-11T10:54:00.000Z'),
  updatedAt: new Date('2026-04-11T10:58:00.000Z'),
  createdBy: '22222222-2222-4222-8222-222222222222',
});
