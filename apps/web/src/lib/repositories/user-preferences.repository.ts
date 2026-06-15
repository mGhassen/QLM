import type {
  UserPreferences,
  UserPreferencesPayload,
} from '@guepard/domain/entities';
import { IUserPreferencesRepository } from '@guepard/domain/repositories';

import { apiGet, apiPatch } from './api-client';

/**
 * Browser-side `IUserPreferencesRepository` — calls the server routes at
 * `GET/PATCH /api/me/preferences`.
 *
 * The `userId` parameter on both methods is intentionally ignored: the
 * server derives the identity from the session cookie, and the browser is
 * never trusted to set its own user id. `get` returns `null` only when the
 * server returns 404 — the phase-1 route returns an empty `{ preferences: {} }`
 * row instead of 404, but we keep the null path in case a future revision
 * changes that contract.
 */
export class HttpUserPreferencesRepository extends IUserPreferencesRepository {
  async get(_userId: string): Promise<UserPreferences | null> {
    return apiGet<UserPreferences>('/me/preferences', true);
  }

  async patch(
    _userId: string,
    patch: Partial<UserPreferencesPayload>,
  ): Promise<UserPreferences> {
    return apiPatch<UserPreferences>('/me/preferences', patch);
  }
}
