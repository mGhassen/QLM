import { describe, expect, it } from 'vitest';

import { UserPreferencesPayloadSchema } from '../../../src/entities/user-preferences.type';
import { GetLastProjectService } from '../../../src/services/user-preferences/get-last-project.usecase';
import { MockUserPreferencesRepository } from './mocks';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_A = '22222222-2222-4222-8222-222222222222';
const ORG_B = '33333333-3333-4333-8333-333333333333';
const PROJ_A = '44444444-4444-4444-8444-444444444444';

describe('GetLastProjectService', () => {
  it('returns the project id when the org has one recorded', async () => {
    const repo = new MockUserPreferencesRepository();
    repo.seed({
      user_id: USER_ID,
      preferences: { last_project_by_org: { [ORG_A]: PROJ_A } },
      created_at: null,
      updated_at: null,
    });
    const service = new GetLastProjectService(repo);

    const result = await service.execute({
      userId: USER_ID,
      organizationId: ORG_A,
    });

    expect(result).toBe(PROJ_A);
  });

  it('returns null when the user has no row', async () => {
    const repo = new MockUserPreferencesRepository();
    const service = new GetLastProjectService(repo);

    const result = await service.execute({
      userId: USER_ID,
      organizationId: ORG_A,
    });

    expect(result).toBeNull();
  });

  it('returns null when the row exists but the org has no entry', async () => {
    const repo = new MockUserPreferencesRepository();
    repo.seed({
      user_id: USER_ID,
      preferences: { last_project_by_org: { [ORG_A]: PROJ_A } },
      created_at: null,
      updated_at: null,
    });
    const service = new GetLastProjectService(repo);

    const result = await service.execute({
      userId: USER_ID,
      organizationId: ORG_B,
    });

    expect(result).toBeNull();
  });

  it('schema rejects non-uuid values in last_project_by_org', () => {
    const parse = () =>
      UserPreferencesPayloadSchema.parse({
        last_project_by_org: { 'not-a-uuid': PROJ_A },
      });
    expect(parse).toThrow();
  });

  it('schema accepts a passthrough future key alongside the known one', () => {
    const parsed = UserPreferencesPayloadSchema.parse({
      last_project_by_org: { [ORG_A]: PROJ_A },
      theme: 'dark',
    });
    expect(parsed.last_project_by_org[ORG_A]).toBe(PROJ_A);
    expect((parsed as unknown as { theme: string }).theme).toBe('dark');
  });
});
