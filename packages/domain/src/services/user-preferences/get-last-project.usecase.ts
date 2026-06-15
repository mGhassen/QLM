import type { IUserPreferencesRepository } from '../../repositories/user-preferences.port';

/**
 * Resolve the user's last-used project for a given organization.
 *
 * Returns the `projectId` stored at `preferences.last_project_by_org[orgId]`
 * when present, else `null`. Fallback to the org's default project belongs
 * in the shell-runtime (Story 006) where `IProjectRepository.findDefault…()`
 * is in scope — domain stays ignorant of project resolution policy.
 */
export class GetLastProjectService {
  constructor(private readonly repository: IUserPreferencesRepository) {}

  public async execute(input: {
    userId: string;
    organizationId: string;
  }): Promise<string | null> {
    const row = await this.repository.get(input.userId);
    if (!row) return null;
    const map = row.preferences.last_project_by_org ?? {};
    return map[input.organizationId] ?? null;
  }
}
