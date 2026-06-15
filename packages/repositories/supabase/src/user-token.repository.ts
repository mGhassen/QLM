import { UserTokenSchema, type UserToken } from '@qlm/domain/entities';
import {
  IUserTokenRepository,
  type CreateUserTokenRow,
} from '@qlm/domain/repositories';
import type { SupabaseClientType } from './types';

/**
 * Supabase-backed `IUserTokenRepository` against `public.user_tokens`.
 *
 * Source-of-truth schema: `apps/web/supabase/schemas/41-platform-settings-and-tokens.sql`.
 * RLS: `apps/web/supabase/schemas/42-platform-rls.sql` — account-scoped reads + writes.
 *
 * The adapter narrows every query by `account_id` even though RLS would do
 * the same work — defense-in-depth against a misconfigured service role or
 * a future bypass path.
 */
export class SupabaseUserTokenRepository extends IUserTokenRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  /**
   * `findAll`, `findBySlug`, `update`, `delete` are intentionally unsupported.
   * The base `RepositoryPort` requires them, but user tokens have no "list
   * across accounts" read (RLS would hide them anyway, bypassing RLS would
   * leak tenants), no slug, no in-place mutate path (revoke replaces update),
   * and no hard-delete (soft-revoke is the lifecycle). Callers must use
   * `findByAccountId` / `findById` / `revoke`.
   */
  async findAll(): Promise<UserToken[]> {
    throw new Error(
      'findAll is not supported — user tokens must be listed per account.',
    );
  }

  async findBySlug(): Promise<UserToken | null> {
    throw new Error('findBySlug is not supported — user tokens have no slug.');
  }

  async update(): Promise<UserToken> {
    throw new Error(
      'update is not supported — use revoke for the one allowed state change.',
    );
  }

  async delete(): Promise<boolean> {
    throw new Error(
      'delete is not supported — user tokens are soft-revoked, not deleted.',
    );
  }

  async findById(id: string): Promise<UserToken | null> {
    const { data, error } = await this.client
      .from('user_tokens')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch user token: ${error.message}`);
    }

    return data ? UserTokenSchema.parse(data) : null;
  }

  async findByAccountId(accountId: string): Promise<UserToken[]> {
    const { data, error } = await this.client
      .from('user_tokens')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch user tokens for account: ${error.message}`,
      );
    }

    return (data ?? []).map((row) => UserTokenSchema.parse(row));
  }

  async create(input: CreateUserTokenRow): Promise<UserToken> {
    const { data, error } = await this.client
      .from('user_tokens')
      .insert({
        account_id: input.account_id,
        token_name: input.token_name,
        scopes: input.scopes,
        expires_at: input.expires_at,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user token: ${error.message}`);
    }

    return UserTokenSchema.parse(data);
  }

  async revoke(id: string, accountId: string): Promise<UserToken | null> {
    const { data, error } = await this.client
      .from('user_tokens')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('account_id', accountId)
      .eq('revoked', false)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to revoke user token: ${error.message}`);
    }

    return data ? UserTokenSchema.parse(data) : null;
  }
}
