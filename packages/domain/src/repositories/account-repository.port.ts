import type { PersonalAccount } from '../entities/personal-account.type';

/**
 * Abstract port for the signed-in user's personal `accounts` row.
 *
 * In v3, `accounts` is personal-only — one row per user — so every operation
 * is scoped by `userId`. The adapter's SQL still narrows by `user_id`
 * defensively in addition to RLS.
 *
 * Avatar upload uses primitive types (`bytes` + `extension`) to keep the
 * domain free of browser DOM types — the runtime resource adapts a `File`
 * into this shape before calling the service.
 *
 * Phase-1 surface: `getMine` + `updateMine` + `uploadAvatar` + `clearAvatar`.
 * Password update and MFA factor ops land in stories 003 and 004.
 */
export abstract class IAccountRepository {
  /** Return the personal account for `userId`, or `null` when the auth trigger hasn't inserted the row yet. */
  public abstract getMine(userId: string): Promise<PersonalAccount | null>;

  /** Partial update of `name` / `pictureUrl`. Returns the persisted row. */
  public abstract updateMine(
    userId: string,
    patch: { name?: string; pictureUrl?: string | null },
  ): Promise<PersonalAccount>;

  /**
   * Upload a new avatar for `userId`. The adapter:
   *  1. Removes any previous file in the `account_image` bucket for this user.
   *  2. Uploads the new bytes at `{userId}.{extension}?v={nanoid}` (cache-bust).
   *  3. Resolves a public URL and persists it to `accounts.picture_url`.
   * Returns the persisted row.
   */
  public abstract uploadAvatar(input: {
    userId: string;
    bytes: ArrayBuffer;
    extension: string;
  }): Promise<PersonalAccount>;

  /**
   * Remove the avatar file (if any) and set `accounts.picture_url = null`.
   * Idempotent: if there is no file to remove, the SQL UPDATE still runs.
   */
  public abstract clearAvatar(userId: string): Promise<PersonalAccount>;

  /**
   * Update the signed-in user's auth password.
   *
   * The adapter MUST re-authenticate the user with `current` against the
   * session email BEFORE calling `auth.updateUser({ password: next })`.
   * This is the password-change re-auth gate documented in spec §9.
   *
   * Wrong `current` → `InvalidCurrentPasswordException` (code 3101). Any
   * other adapter failure surfaces as a generic Error.
   */
  public abstract updatePassword(input: {
    sessionEmail: string;
    current: string;
    next: string;
  }): Promise<void>;
}
