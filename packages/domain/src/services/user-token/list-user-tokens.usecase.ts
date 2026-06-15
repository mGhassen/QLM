import type { IUserTokenRepository } from '../../repositories';
import type { UserToken } from '../../entities';

/**
 * Lists all user tokens for an account, ordered `created_at DESC` (the order
 * is enforced by the adapter, not the service).
 *
 * Pass-through to `repo.findByAccountId`. The service exists for layering
 * consistency (every read goes through a use-case) and to give Story 008's
 * HTTP adapter a single place to hook caching / invalidation if it turns out
 * to matter.
 */
export class ListUserTokensService {
  constructor(private readonly repository: IUserTokenRepository) {}

  public async execute(input: { accountId: string }): Promise<UserToken[]> {
    return this.repository.findByAccountId(input.accountId);
  }
}
