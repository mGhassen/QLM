import { UserToken, UserTokenScope } from '../entities';
import { RepositoryPort } from './base-repository.port';

/**
 * Persistence input for inserting a new user token row. Mirrors the columns
 * an `INSERT` actually sets — timestamp / user-tracking columns come from
 * Postgres triggers (`set_user_tokens_timestamps`, `set_user_tokens_user_tracking`)
 * so we don't set them here.
 *
 * Note: this shape is deliberately different from `CreateUserTokenInput` (the
 * usecase DTO): the DTO describes what the caller sends over the wire (no
 * `account_id` — the server resolves it from the session); this shape describes
 * what hits the DB (must include `account_id` because the row needs an owner).
 */
export type CreateUserTokenRow = {
  account_id: string;
  token_name: string;
  scopes: UserTokenScope[];
  expires_at: number;
};

/**
 * Abstract port for user-token persistence. Implementations:
 *
 * - `SupabaseUserTokenRepository` (Story 005) — server-side, direct Supabase calls.
 * - `HttpUserTokenRepository` (Story 008) — browser-side, HTTP calls to `apps/server`.
 *
 * Every method is account-scoped: the repository never exposes rows across
 * account boundaries. Even the adapter SQL narrows by `account_id` defensively
 * in addition to RLS.
 */
export abstract class IUserTokenRepository extends RepositoryPort<
  UserToken,
  string
> {
  /** All tokens owned by a single account. Order: `created_at DESC`. */
  public abstract findByAccountId(accountId: string): Promise<UserToken[]>;

  /** Insert a new row and return it. Triggers fill timestamps + user-tracking. */
  public abstract create(input: CreateUserTokenRow): Promise<UserToken>;

  /**
   * Soft-revoke: set `revoked = true`, `revoked_at = now()`. The adapter SQL
   * narrows the UPDATE to `revoked = false` so an already-revoked row returns
   * zero affected rows — in that case the method returns `null` and the
   * calling service maps it to `tokenAlreadyRevokedException(id)`. Same null
   * return is used for unknown ids; the service disambiguates via a
   * `findByAccountId` check if needed.
   */
  public abstract revoke(
    id: string,
    accountId: string,
  ): Promise<UserToken | null>;
}
