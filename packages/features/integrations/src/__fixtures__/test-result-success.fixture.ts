import type { TestResult } from '@guepard/domain/usecases';

/**
 * A successful connection test result for an AWS integration — what the
 * AwsDriver.testConnection() path maps GetCallerIdentity into.
 */
export const testResultSuccessAwsFixture: TestResult = {
  ok: true,
  identity: 'arn:aws:iam::123456789012:user/guepard',
};

/**
 * A successful connection test result for a GCP integration.
 */
export const testResultSuccessGcpFixture: TestResult = {
  ok: true,
  identity: 'guepard-runtime@guepard-analytics-prod.iam.gserviceaccount.com',
};
