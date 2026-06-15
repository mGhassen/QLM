import { describe, expect, it } from 'vitest';

import { SetLastProjectService } from '../../../src/services/user-preferences/set-last-project.usecase';
import { MockUserPreferencesRepository } from './mocks';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_A = '22222222-2222-4222-8222-222222222222';
const ORG_B = '33333333-3333-4333-8333-333333333333';
const PROJ_A = '44444444-4444-4444-8444-444444444444';
const PROJ_B = '55555555-5555-4555-8555-555555555555';

describe('SetLastProjectService', () => {
  it('sends a partial patch scoped to the target org', async () => {
    const repo = new MockUserPreferencesRepository();
    const service = new SetLastProjectService(repo);

    await service.execute({
      userId: USER_ID,
      organizationId: ORG_A,
      projectId: PROJ_A,
    });

    expect(repo.patchCalls).toHaveLength(1);
    expect(repo.patchCalls[0]).toEqual({
      userId: USER_ID,
      patch: { last_project_by_org: { [ORG_A]: PROJ_A } },
    });
  });

  it('preserves sibling org entries across writes (adapter merge contract)', async () => {
    const repo = new MockUserPreferencesRepository();
    repo.seed({
      user_id: USER_ID,
      preferences: { last_project_by_org: { [ORG_B]: PROJ_B } },
      created_at: null,
      updated_at: null,
    });
    const service = new SetLastProjectService(repo);

    const row = await service.execute({
      userId: USER_ID,
      organizationId: ORG_A,
      projectId: PROJ_A,
    });

    expect(row.preferences.last_project_by_org).toEqual({
      [ORG_A]: PROJ_A,
      [ORG_B]: PROJ_B,
    });
  });

  it('returns the refreshed row with a stamped updated_at', async () => {
    const repo = new MockUserPreferencesRepository();
    const service = new SetLastProjectService(repo);

    const row = await service.execute({
      userId: USER_ID,
      organizationId: ORG_A,
      projectId: PROJ_A,
    });

    expect(row.updated_at).not.toBeNull();
  });
});
