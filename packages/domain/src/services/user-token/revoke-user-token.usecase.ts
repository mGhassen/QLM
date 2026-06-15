import type { IUserTokenRepository } from '../../repositories';
import { tokenNotFoundException } from '../../exceptions/token-not-found.exception';
import type { RevokeUserTokenOutput } from '../../usecases/dto/user-token-usecase-dto';

/**
 * Soft-revokes a user token.
 *
 * Flow (matches RFC 0009 spec §4.2):
 *  1. Delegate to `repo.revoke(id, accountId)`. The adapter narrows the UPDATE
 *     to `revoked = false` so already-revoked rows return `null`.
 *  2. On `null` → throw `tokenNotFoundException(id)`. Phase 1 does not
 *     distinguish "not found" from "already revoked" at the service layer;
 *     both surface as NOT_FOUND. Story 005's adapter may refine this later.
 *  3. Return the updated row so the caller can render the new `revoked` +
 *     `revoked_at` values without a second round-trip.
 */
export class RevokeUserTokenService {
  constructor(private readonly repository: IUserTokenRepository) {}

  public async execute(input: {
    id: string;
    accountId: string;
  }): Promise<RevokeUserTokenOutput> {
    const row = await this.repository.revoke(input.id, input.accountId);

    if (row === null) {
      throw tokenNotFoundException(input.id);
    }

    return row;
  }
}
