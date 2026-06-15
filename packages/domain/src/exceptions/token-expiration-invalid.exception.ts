import { Code } from '../common/code';
import { DomainException } from './domain-exception';

/**
 * Defensive — raised when a caller bypasses the Zod `.refine` on
 * `CreateUserTokenInputSchema` and passes an `expires_at` in the past or more
 * than 365 days in the future. The schema catches these first; this exception
 * exists so services that receive a pre-parsed input can still fail
 * consistently.
 */
export function tokenExpirationInvalidException(
  reason: 'in-the-past' | 'beyond-365-days',
  expiresAt: number,
) {
  return DomainException.new({
    code: Code.USER_TOKEN_EXPIRATION_INVALID_ERROR,
    overrideMessage:
      reason === 'in-the-past'
        ? `Token expiration must be in the future (got ${expiresAt}).`
        : `Token expiration must be within 365 days (got ${expiresAt}).`,
    data: { reason, expiresAt },
  });
}
