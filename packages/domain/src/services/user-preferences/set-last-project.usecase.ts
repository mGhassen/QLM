import type { UserPreferences } from '../../entities/user-preferences.type';
import type { IUserPreferencesRepository } from '../../repositories/user-preferences.port';

/**
 * Record `projectId` as the user's last-used project for `organizationId`.
 *
 * Emits a partial patch that only touches `last_project_by_org[orgId]`.
 * The repository adapter is responsible for atomically merging the patch
 * into the existing jsonb so sibling keys under `last_project_by_org` and
 * other future top-level fields survive.
 *
 * Returns the refreshed row so callers can observe `updated_at`.
 */
export class SetLastProjectService {
  constructor(private readonly repository: IUserPreferencesRepository) {}

  public async execute(input: {
    userId: string;
    organizationId: string;
    projectId: string;
  }): Promise<UserPreferences> {
    return this.repository.patch(input.userId, {
      last_project_by_org: { [input.organizationId]: input.projectId },
    });
  }
}
