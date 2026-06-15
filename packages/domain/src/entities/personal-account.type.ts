import { z } from 'zod';

/**
 * A `public.accounts` row for the signed-in user. In v3 accounts are
 * personal-only (one per user) — team accounts were replaced by
 * `public.organizations`. See `apps/web/supabase/schemas/04-initial-tables.sql`.
 *
 * `pictureUrl` and `email` are nullable; `name` is `not null` at the DB
 * level but is treated as "must be non-empty trimmed" at the domain level.
 */
export const PersonalAccountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email().nullable(),
  pictureUrl: z.string().url().nullable(),
  updatedAt: z.string().datetime().nullable(),
});

export type PersonalAccount = z.infer<typeof PersonalAccountSchema>;
