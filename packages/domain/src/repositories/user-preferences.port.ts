import type {
  UserPreferences,
  UserPreferencesPayload,
} from '../entities/user-preferences.type';

/**
 * Abstract port for `user_preferences`. Two operations:
 *
 * - `get(userId)` returns the row or `null` when the user has no row yet.
 *   Adapters never auto-create; callers treat `null` as "empty preferences".
 *
 * - `patch(userId, patch)` merges `patch` into the existing `preferences`
 *   jsonb. The merge is atomic server-side (`preferences || $1::jsonb`);
 *   adapters are responsible for upserting when no row exists yet. Returns
 *   the resulting row so callers can observe `updated_at` for cache stamps.
 *
 * Implementations live in `packages/repositories/supabase/*` and
 * `apps/web/src/lib/repositories/*` (Story 005).
 */
export abstract class IUserPreferencesRepository {
  public abstract get(userId: string): Promise<UserPreferences | null>;
  public abstract patch(
    userId: string,
    patch: Partial<UserPreferencesPayload>,
  ): Promise<UserPreferences>;
}
