import { Code } from '../common/code';
import { DomainException } from './domain-exception';

/**
 * Raised by `UpdatePasswordService` when the supplied `current` password
 * does not match the session — the adapter's `signInWithPassword` re-auth
 * call rejected. Surface as an inline error on the `currentPassword`
 * field; never reveal whether the email itself is valid.
 */
export function invalidCurrentPasswordException() {
  return DomainException.new({
    code: Code.INVALID_CURRENT_PASSWORD_ERROR,
    overrideMessage: 'Current password is incorrect.',
  });
}
