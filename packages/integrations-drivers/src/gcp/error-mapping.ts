import type { TestResultErrorCode } from '@guepard/domain/usecases';

/**
 * Maps a GCP REST / google-auth-library error to one of the closed-set
 * error codes the UI renders.
 *
 * `google-auth-library` throws errors that expose the underlying HTTP
 * response on `error.response.status`. Network failures (no response) set
 * `code` on the thrown error (e.g. `ENOTFOUND`).
 */
export function mapGcpError(error: unknown): {
  errorCode: TestResultErrorCode;
  errorMessage: string;
} {
  const errorObject =
    error && typeof error === 'object'
      ? (error as Record<string, unknown>)
      : {};
  const message =
    typeof errorObject.message === 'string'
      ? errorObject.message
      : String(error);
  const code = typeof errorObject.code === 'string' ? errorObject.code : '';

  const response =
    errorObject.response && typeof errorObject.response === 'object'
      ? (errorObject.response as Record<string, unknown>)
      : null;
  const status =
    response && typeof response.status === 'number'
      ? (response.status as number)
      : null;

  if (status === 401) {
    return { errorCode: 'invalid_credentials', errorMessage: message };
  }

  if (status === 403) {
    return { errorCode: 'permission_denied', errorMessage: message };
  }

  if (
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET'
  ) {
    return { errorCode: 'network', errorMessage: message };
  }

  // "invalid_grant" is the google-auth-library message when the signed
  // assertion is rejected at token exchange time — effectively a bad key.
  if (message.includes('invalid_grant')) {
    return { errorCode: 'invalid_credentials', errorMessage: message };
  }

  return { errorCode: 'unknown', errorMessage: message };
}
