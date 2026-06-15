import type { UserToken } from '@guepard/domain/entities';
import {
  IUserTokenRepository,
  type CreateUserTokenRow,
} from '@guepard/domain/repositories';
import type { CreateUserTokenOutput } from '@guepard/domain/usecases';

import { apiGet, apiPost } from './api-client';

/**
 * Browser-side `IUserTokenRepository` that calls the Story-006 server
 * endpoints under `/api/user-tokens`.
 *
 * Account scoping: the server derives `account_id` from the request session
 * (Story 006 / `getCurrentAccountId`), so the `accountId` parameter on
 * `findByAccountId` and `revoke` is intentionally ignored, and `create`
 * drops the `account_id` field before sending. The browser cannot be
 * trusted to set its own account id.
 */
export class HttpUserTokenRepository extends IUserTokenRepository {
  async findByAccountId(_accountId: string): Promise<UserToken[]> {
    const result = await apiGet<UserToken[]>('/user-tokens', false);
    return result ?? [];
  }

  async create(input: CreateUserTokenRow): Promise<UserToken> {
    const result = await this.createAndIssueJwt(input);
    // The base port returns just `UserToken`. The `rawJwt` is dropped here
    // because the port is the *general* contract; callers that need the
    // JWT (which is a one-time browser-only concern) call
    // `createAndIssueJwt` directly instead.
    return result.row;
  }

  /**
   * Browser-only extension on top of the port. Returns `{ row, rawJwt }`
   * straight from the server response so the create-mutation hook can plumb
   * `rawJwt` into the reveal-once pane (Story 011).
   *
   * Not on `IUserTokenRepository` because the rest of the system has no
   * legitimate need for raw JWT material — the server-side `CreateUserTokenService`
   * synthesises its own via `IJwtSigner`, and the browser never re-signs.
   */
  async createAndIssueJwt(
    input: CreateUserTokenRow,
  ): Promise<CreateUserTokenOutput> {
    const { account_id: _ignored, ...payload } = input;
    return apiPost<CreateUserTokenOutput>('/user-tokens', payload);
  }

  async revoke(id: string, _accountId: string): Promise<UserToken | null> {
    return apiPost<UserToken>(`/user-tokens/${id}/revoke`, {});
  }

  // Base `RepositoryPort` requires these; user tokens have no use for them.
  // Mirrors the supabase adapter's "intentionally unsupported" pattern.

  async findAll(): Promise<UserToken[]> {
    throw new Error(
      'findAll is not supported — user tokens must be listed per account.',
    );
  }

  async findById(): Promise<UserToken | null> {
    throw new Error(
      'findById is not supported — phase 1 only lists per account.',
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
}
