import type { QueryClient } from '@tanstack/react-query';

import { UserPreferencesPayloadSchema } from '@guepard/domain/entities';
import type {
  UserPreferences,
  UserPreferencesPayload,
} from '@guepard/domain/entities';
import type {
  IProjectRepository,
  IUserPreferencesRepository,
} from '@guepard/domain/repositories';
import { GetLastProjectService } from '@guepard/domain/services';

/**
 * Shell-runtime resource for per-user preferences.
 *
 * Phase 1 only writes `last_project_by_org`. The resource mediates between
 * presentation (`useShell().userPreferences.*`) and the two use cases in
 * `@guepard/domain/services/user-preferences`.
 *
 * `setLastProject` does a read-merge-patch in memory before calling
 * `repository.patch`: postgres `jsonb ||` is a shallow concat, so a naive
 * single-key patch for `last_project_by_org` would clobber sibling orgs.
 */
export function createUserPreferencesResource(
  repository: IUserPreferencesRepository,
  projectRepository: IProjectRepository,
  queryClient: QueryClient,
  currentUserId: string,
) {
  const keys = {
    root: ['user-preferences'] as const,
  };

  const invalidate = {
    root: () => queryClient.invalidateQueries({ queryKey: keys.root }),
  };

  /** Resolve the stored `last_project_by_org[orgId]`, or the org's first project as a fallback. */
  async function getLastProject(orgId: string): Promise<string | null> {
    const stored = await new GetLastProjectService(repository).execute({
      userId: currentUserId,
      organizationId: orgId,
    });
    if (stored) return stored;

    const projects = await projectRepository.findAllByOrganizationId(orgId);
    return projects[0]?.id ?? null;
  }

  /**
   * Record `projectId` under `last_project_by_org[orgId]`.
   *
   * Pre-reads the row and builds the full `last_project_by_org` map
   * client-side because jsonb `||` is shallow — submitting only
   * `{ [orgId]: projectId }` would discard every other org's entry.
   * The narrow race between concurrent switches is acceptable for phase 1.
   *
   * Bypasses `SetLastProjectService` (which emits a single-key patch by
   * design) because that service was written before the shallow-merge
   * constraint was known; the merge responsibility now lives in the
   * runtime resource.
   */
  async function setLastProject(
    orgId: string,
    projectId: string,
  ): Promise<UserPreferences> {
    const current = await repository.get(currentUserId);
    const existing = current?.preferences.last_project_by_org ?? {};
    const mergedMap = { ...existing, [orgId]: projectId };
    return repository.patch(currentUserId, { last_project_by_org: mergedMap });
  }

  async function mergePreferences(
    patch: Partial<UserPreferencesPayload>,
  ): Promise<UserPreferences> {
    const validated = UserPreferencesPayloadSchema.partial()
      .passthrough()
      .parse(patch);
    return repository.patch(currentUserId, validated);
  }

  return {
    keys,
    getLastProject,
    setLastProject,
    mergePreferences,
    invalidate,
  };
}

export type UserPreferencesResource = ReturnType<
  typeof createUserPreferencesResource
>;
