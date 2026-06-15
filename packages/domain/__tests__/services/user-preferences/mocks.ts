import type {
  UserPreferences,
  UserPreferencesPayload,
} from '../../../src/entities/user-preferences.type';
import { IUserPreferencesRepository } from '../../../src/repositories/user-preferences.port';

/**
 * In-memory stub implementing the domain port. Backed by a single
 * `preferences` object keyed to the first `userId` it sees — domain tests
 * never exercise multi-user behaviour, that's the adapter's job.
 */
export class MockUserPreferencesRepository extends IUserPreferencesRepository {
  public row: UserPreferences | null = null;
  public getCalls: string[] = [];
  public patchCalls: {
    userId: string;
    patch: Partial<UserPreferencesPayload>;
  }[] = [];

  public seed(row: UserPreferences | null): void {
    this.row = row;
  }

  async get(userId: string): Promise<UserPreferences | null> {
    this.getCalls.push(userId);
    return this.row;
  }

  async patch(
    userId: string,
    patch: Partial<UserPreferencesPayload>,
  ): Promise<UserPreferences> {
    this.patchCalls.push({ userId, patch });
    const prev = this.row ?? {
      user_id: userId,
      preferences: { last_project_by_org: {} },
      created_at: null,
      updated_at: null,
    };
    const prevMap = prev.preferences.last_project_by_org ?? {};
    const patchMap = patch.last_project_by_org ?? {};
    this.row = {
      ...prev,
      preferences: {
        ...prev.preferences,
        last_project_by_org: { ...prevMap, ...patchMap },
      },
      updated_at: new Date().toISOString(),
    };
    return this.row;
  }
}
