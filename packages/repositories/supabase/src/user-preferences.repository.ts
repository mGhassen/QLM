import {
  UserPreferencesSchema,
  type UserPreferences,
  type UserPreferencesPayload,
} from '@qlm/domain/entities';
import { IUserPreferencesRepository } from '@qlm/domain/repositories';
import type { Json } from '@qlm/supabase/database';

import type { SupabaseClientType } from './types';

/**
 * Supabase-backed `IUserPreferencesRepository` against
 * `public.user_preferences`. The `patch` path routes through the
 * `public.merge_user_preferences(jsonb)` RPC for an atomic
 * insert-or-jsonb-merge — Supabase JS `.upsert()` would replace the
 * `preferences` column instead of merging it, which would let concurrent
 * PATCH requests clobber each other's keys.
 *
 * Schema: `apps/web/supabase/schemas/43-user-preferences.sql` and
 * `apps/web/supabase/schemas/44-user-preferences-merge-fn.sql`.
 *
 * `userId` is accepted by the port for symmetry with the HTTP adapter,
 * but the SQL function derives the user from `auth.uid()` — RLS still
 * enforces that every access is scoped to the caller's row.
 */
export class SupabaseUserPreferencesRepository extends IUserPreferencesRepository {
  constructor(private readonly client: SupabaseClientType) {
    super();
  }

  async get(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await this.client
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch user preferences: ${error.message}`);
    }

    return data ? UserPreferencesSchema.parse(data) : null;
  }

  async patch(
    _userId: string,
    patch: Partial<UserPreferencesPayload>,
  ): Promise<UserPreferences> {
    const { data, error } = await this.client.rpc('merge_user_preferences', {
      p_patch: patch as unknown as Json,
    });

    if (error) {
      throw new Error(`Failed to patch user preferences: ${error.message}`);
    }

    return UserPreferencesSchema.parse(data);
  }
}
