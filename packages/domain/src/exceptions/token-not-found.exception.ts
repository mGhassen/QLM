import { Code } from '../common/code';
import { DomainException } from './domain-exception';

/**
 * Raised when a revoke or lookup targets a `user_tokens` row that doesn't
 * exist (or that RLS hides from the caller).
 */
export function tokenNotFoundException(tokenId: string) {
  return DomainException.new({
    code: Code.USER_TOKEN_NOT_FOUND_ERROR,
    overrideMessage: `User token "${tokenId}" not found.`,
    data: { tokenId },
  });
}
