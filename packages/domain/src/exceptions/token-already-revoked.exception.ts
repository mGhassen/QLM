import { Code } from '../common/code';
import { DomainException } from './domain-exception';

/**
 * Raised when a revoke action targets a token whose `revoked` flag is already
 * `true`. The repository's SQL narrows the UPDATE to `revoked = false` so an
 * already-revoked row returns zero affected rows; the service maps that to
 * this 409-style exception (distinct from not-found so the API layer can
 * respond with 409 instead of 404).
 */
export function tokenAlreadyRevokedException(tokenId: string) {
  return DomainException.new({
    code: Code.USER_TOKEN_ALREADY_REVOKED_ERROR,
    overrideMessage: `User token "${tokenId}" is already revoked.`,
    data: { tokenId },
  });
}
