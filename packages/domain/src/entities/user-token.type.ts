import { Entity } from '../common/entity';
import { z } from 'zod';
import { Exclude, Expose } from 'class-transformer';

import { UserTokenScopeSchema, type UserTokenScope } from './user-token-scope';

/**
 * UserToken — mirrors `public.user_tokens` exactly.
 *
 * Source of truth: `apps/web/supabase/schemas/41-platform-settings-and-tokens.sql`
 * plus RLS in `apps/web/supabase/schemas/42-platform-rls.sql`.
 *
 * Column naming stays snake_case (DB pass-through) to keep the entity aligned
 * with the existing Datasource convention for DB-column fields.
 *
 * Quirk captured by `.nullable().transform(...)` on `revoked`:
 * the landed DB column is `revoked boolean default false` — no `NOT NULL`
 * constraint (see RFC 0009 spec §1 Q5). We normalise `null → false` here so
 * downstream services always see a strict boolean. A phase-2 follow-up is
 * tracked to add `ALTER COLUMN revoked SET NOT NULL`; no code change will be
 * needed here when it lands.
 */
export const UserTokenSchema = z.object({
  id: z.string().uuid().describe('Primary key of the user token.'),
  account_id: z
    .string()
    .uuid()
    .describe('FK to public.accounts (1:1 with auth.users).'),
  token_name: z
    .string()
    .min(1)
    .max(255)
    .describe('Human-readable name the user gives the token.'),
  scopes: z
    .array(UserTokenScopeSchema)
    .min(1)
    .describe('At least one method-based scope.'),
  expires_at: z
    .number()
    .int()
    .positive()
    .describe('Unix epoch seconds; stored as bigint in the DB.'),
  revoked: z
    .boolean()
    .nullable()
    .transform((v) => v ?? false)
    .describe(
      'Normalised to boolean on read. DB column allows null; phase-2 follow-up hardens NOT NULL.',
    ),
  revoked_at: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .describe(
      'ISO-8601 timestamp when the token was revoked; null if active. `offset: true` because Supabase/Postgres emits `+00:00` timestamps rather than the `Z`-terminated strict form.',
    ),
  created_at: z.string().datetime({ offset: true }).nullable(),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  created_by: z.string().uuid().nullable(),
  updated_by: z.string().uuid().nullable(),
});

export type UserToken = z.infer<typeof UserTokenSchema>;

/**
 * `UserTokenEntity` — `@Expose()`-decorated value object for class-transformer
 * serialisation boundaries. Phase 1 has no `create()` / `update()` factory
 * methods because services drive persistence directly via the repository
 * port; later stories can add factories if an OOP construction seam becomes
 * useful.
 */
@Exclude()
export class UserTokenEntity extends Entity<string, typeof UserTokenSchema> {
  @Expose()
  declare public id: string;
  @Expose()
  public account_id!: string;
  @Expose()
  public token_name!: string;
  @Expose()
  public scopes!: UserTokenScope[];
  @Expose()
  public expires_at!: number;
  @Expose()
  public revoked!: boolean;
  @Expose()
  public revoked_at!: string | null;
  @Expose()
  public created_at!: string | null;
  @Expose()
  public updated_at!: string | null;
  @Expose()
  public created_by!: string | null;
  @Expose()
  public updated_by!: string | null;
}
