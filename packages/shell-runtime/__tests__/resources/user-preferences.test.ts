import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  UserPreferences,
  UserPreferencesPayload,
} from '@guepard/domain/entities';
import {
  IProjectRepository,
  IUserPreferencesRepository,
} from '@guepard/domain/repositories';

import { createUserPreferencesResource } from '../../src/resources/user-preferences';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_A = '22222222-2222-4222-8222-222222222222';
const ORG_B = '33333333-3333-4333-8333-333333333333';
const PROJECT_A = '44444444-4444-4444-8444-444444444444';
const PROJECT_B = '55555555-5555-4555-8555-555555555555';

function makeRow(
  preferences: UserPreferencesPayload = { last_project_by_org: {} },
): UserPreferences {
  return {
    user_id: USER_ID,
    preferences,
    created_at: '2026-04-19T00:00:00.000Z',
    updated_at: '2026-04-19T00:00:00.000Z',
  };
}

class StubUserPrefsRepo extends IUserPreferencesRepository {
  public getMock = vi.fn<
    (userId: string) => Promise<UserPreferences | null>
  >();
  public patchMock = vi.fn<
    (
      userId: string,
      patch: Partial<UserPreferencesPayload>,
    ) => Promise<UserPreferences>
  >();

  get(userId: string) {
    return this.getMock(userId);
  }

  patch(userId: string, patch: Partial<UserPreferencesPayload>) {
    return this.patchMock(userId, patch);
  }
}

class StubProjectRepo extends IProjectRepository {
  public findAllByOrganizationIdMock = vi.fn<
    (orgId: string) => Promise<Array<{ id: string; slug: string }>>
  >();

  findAllByOrganizationId(orgId: string) {
    return this.findAllByOrganizationIdMock(orgId) as never;
  }
  // The remaining methods are unused by the resource under test; stub them
  // as throw so any accidental call surfaces loudly.
  findById() {
    throw new Error('not implemented in stub');
  }
  findBySlug() {
    throw new Error('not implemented in stub');
  }
  findAll() {
    throw new Error('not implemented in stub');
  }
  create() {
    throw new Error('not implemented in stub');
  }
  update() {
    throw new Error('not implemented in stub');
  }
  delete() {
    throw new Error('not implemented in stub');
  }
}

function makeResource() {
  const prefs = new StubUserPrefsRepo();
  const projects = new StubProjectRepo();
  const queryClient = new QueryClient();
  const resource = createUserPreferencesResource(
    prefs,
    projects,
    queryClient,
    USER_ID,
  );
  return { prefs, projects, queryClient, resource };
}

describe('createUserPreferencesResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLastProject', () => {
    it('returns the stored projectId for the org', async () => {
      const { prefs, resource } = makeResource();
      prefs.getMock.mockResolvedValue(
        makeRow({ last_project_by_org: { [ORG_A]: PROJECT_A } }),
      );

      const result = await resource.getLastProject(ORG_A);
      expect(result).toBe(PROJECT_A);
    });

    it("falls back to the org's first project when no entry exists", async () => {
      const { prefs, projects, resource } = makeResource();
      prefs.getMock.mockResolvedValue(makeRow());
      projects.findAllByOrganizationIdMock.mockResolvedValue([
        { id: PROJECT_B, slug: 'first' },
        { id: PROJECT_A, slug: 'second' },
      ]);

      const result = await resource.getLastProject(ORG_A);
      expect(result).toBe(PROJECT_B);
    });

    it('returns null when the org has no projects and no stored entry', async () => {
      const { prefs, projects, resource } = makeResource();
      prefs.getMock.mockResolvedValue(null);
      projects.findAllByOrganizationIdMock.mockResolvedValue([]);

      const result = await resource.getLastProject(ORG_A);
      expect(result).toBeNull();
    });
  });

  describe('setLastProject', () => {
    it('preserves existing orgs when adding a new one', async () => {
      const { prefs, resource } = makeResource();
      prefs.getMock.mockResolvedValue(
        makeRow({ last_project_by_org: { [ORG_A]: PROJECT_A } }),
      );
      prefs.patchMock.mockImplementation(async (_uid, patch) =>
        makeRow(patch as UserPreferencesPayload),
      );

      await resource.setLastProject(ORG_B, PROJECT_B);

      expect(prefs.patchMock).toHaveBeenCalledTimes(1);
      const [, patch] = prefs.patchMock.mock.calls[0]!;
      expect(patch).toEqual({
        last_project_by_org: {
          [ORG_A]: PROJECT_A,
          [ORG_B]: PROJECT_B,
        },
      });
    });

    it('writes the map with a single entry when no row exists yet', async () => {
      const { prefs, resource } = makeResource();
      prefs.getMock.mockResolvedValue(null);
      prefs.patchMock.mockImplementation(async (_uid, patch) =>
        makeRow(patch as UserPreferencesPayload),
      );

      await resource.setLastProject(ORG_A, PROJECT_A);

      const [, patch] = prefs.patchMock.mock.calls[0]!;
      expect(patch).toEqual({
        last_project_by_org: { [ORG_A]: PROJECT_A },
      });
    });
  });

  describe('mergePreferences', () => {
    it('validates the payload and forwards to patch', async () => {
      const { prefs, resource } = makeResource();
      prefs.patchMock.mockImplementation(async (_uid, patch) =>
        makeRow(patch as UserPreferencesPayload),
      );

      await resource.mergePreferences({
        last_project_by_org: { [ORG_A]: PROJECT_A },
      });

      expect(prefs.patchMock).toHaveBeenCalledWith(USER_ID, {
        last_project_by_org: { [ORG_A]: PROJECT_A },
      });
    });

    it('rejects invalid payloads (non-uuid values)', async () => {
      const { resource } = makeResource();
      await expect(
        resource.mergePreferences({
          last_project_by_org: { [ORG_A]: 'not-a-uuid' },
        }),
      ).rejects.toThrow();
    });
  });

  describe('keys + invalidate', () => {
    it('exposes a stable query key namespace', () => {
      const { resource } = makeResource();
      expect(resource.keys.root).toEqual(['user-preferences']);
    });

    it('invalidate.root triggers the matching query key', async () => {
      const { queryClient, resource } = makeResource();
      const spy = vi.spyOn(queryClient, 'invalidateQueries');
      await resource.invalidate.root();
      expect(spy).toHaveBeenCalledWith({
        queryKey: resource.keys.root,
      });
    });
  });
});
