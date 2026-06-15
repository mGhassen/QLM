import { Code } from '../common/code';
import { DomainException } from './domain-exception';

/**
 * Raised by `UpdatePersonalAccountService` when the submitted profile patch
 * fails validation (empty name, over 255 chars, malformed picture URL, etc.).
 * Callers should surface this as an inline field error — do not retry.
 */
export function invalidProfileInputException(reason: string) {
  return DomainException.new({
    code: Code.INVALID_PROFILE_INPUT_ERROR,
    overrideMessage: `Invalid profile input: ${reason}`,
    data: { reason },
  });
}
