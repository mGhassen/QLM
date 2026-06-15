export { AwsDriver, defaultAwsClientFactories } from './aws/aws-driver';
export type { AwsClientFactories } from './aws/aws-driver';
export { mapAwsError } from './aws/error-mapping';

export { GcpDriver, defaultGcpClientFactory } from './gcp/gcp-driver';
export type { GcpClientFactory } from './gcp/gcp-driver';
export { mapGcpError } from './gcp/error-mapping';

export { IntegrationProviderDriverRegistry } from './registry';
