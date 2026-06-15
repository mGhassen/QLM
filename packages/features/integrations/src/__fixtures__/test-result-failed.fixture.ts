import type { TestResult } from '@guepard/domain/usecases';

/**
 * One fixture per error code in the `TestResultErrorCode` closed set.
 * The AwsCredentialsForm / GcpCredentialsForm stories cycle through these
 * to validate every error rendering path.
 */
export const testResultInvalidCredentialsFixture: TestResult = {
  ok: false,
  errorCode: 'invalid_credentials',
  errorMessage: 'The security token included in the request is invalid.',
};

export const testResultPermissionDeniedFixture: TestResult = {
  ok: false,
  errorCode: 'permission_denied',
  errorMessage:
    'User arn:aws:iam::123456789012:user/readonly is not authorised to perform: sts:GetCallerIdentity',
};

export const testResultNetworkFixture: TestResult = {
  ok: false,
  errorCode: 'network',
  errorMessage:
    'Could not reach sts.amazonaws.com — getaddrinfo ENOTFOUND sts.amazonaws.com',
};

export const testResultUnknownFixture: TestResult = {
  ok: false,
  errorCode: 'unknown',
  errorMessage: 'An unknown error occurred while contacting the provider.',
};
