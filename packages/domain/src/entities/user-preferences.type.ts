import { z } from 'zod';

/**
 * UserPreferences — mirrors `public.user_preferences` (see
 * `apps/web/supabase/schemas/43-user-preferences.sql`). Single-row-per-user
 * JSONB bag for private, non-sensitive preferences.
 *
 * Phase 1 only writes `last_project_by_org`; the payload is declared with
 * `.passthrough()` so future phases can extend it without a schema migration
 * or a coordinated domain update.
 *
 * Source of truth for the shape is this schema — the shell-runtime validates
 * every write through `UserPreferencesPayloadSchema.parse(...)` before it
 * hits the repository.
 */
export const UserPreferencesPayloadSchema = z
  .object({
    last_project_by_org: z
      .record(z.string().uuid(), z.string().uuid())
      .default({}),
  })
  .passthrough();

export type UserPreferencesPayload = z.infer<
  typeof UserPreferencesPayloadSchema
>;

export const UserPreferencesSchema = z.object({
  user_id: z.string().uuid(),
  preferences: UserPreferencesPayloadSchema,
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
