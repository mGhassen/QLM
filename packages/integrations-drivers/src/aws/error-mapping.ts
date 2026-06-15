import type { TestResultErrorCode } from '@guepard/domain/usecases';

/**
 * Maps an AWS SDK error to one of the closed-set error codes the UI renders.
 *
 * The AWS SDK throws errors with a `name` field that matches the exception
 * type from the service (e.g. `InvalidClientTokenId`, `AccessDenied`).
 * Lower-level network failures surface as errors with `code` = `ENOTFOUND`,
 * `ECONNREFUSED`, `ETIMEDOUT`, etc.
 */
export function mapAwsError(error: unknown): {
  errorCode: TestResultErrorCode;
  errorMessage: string;
} {
  const errorObject =
    error && typeof error === 'object'
      ? (error as Record<string, unknown>)
      : {};
  const name = typeof errorObject.name === 'string' ? errorObject.name : '';
  const code = typeof errorObject.code === 'string' ? errorObject.code : '';
  const message =
    typeof errorObject.message === 'string'
      ? errorObject.message
      : String(error);

  if (
    name === 'InvalidClientTokenId' ||
    name === 'SignatureDoesNotMatch' ||
    name === 'UnrecognizedClientException' ||
    name === 'CredentialsProviderError' ||
    name === 'ExpiredTokenException' ||
    name === 'InvalidAccessKeyId'
  ) {
    return { errorCode: 'invalid_credentials', errorMessage: message };
  }

  if (
    name === 'AccessDenied' ||
    name === 'AccessDeniedException' ||
    name === 'UnauthorizedOperation' ||
    name === 'Forbidden' ||
    name === 'AuthFailure'
  ) {
    return { errorCode: 'permission_denied', errorMessage: message };
  }

  if (
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    name === 'NetworkingError' ||
    name === 'TimeoutError'
  ) {
    return { errorCode: 'network', errorMessage: message };
  }

  return { errorCode: 'unknown', errorMessage: message };
}
