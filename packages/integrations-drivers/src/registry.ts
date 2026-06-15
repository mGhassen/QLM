import type { IntegrationProvider } from '@guepard/domain/entities';
import {
  IIntegrationProviderDriverRegistry,
  type IIntegrationProviderDriver,
} from '@guepard/domain/services';

import { AwsDriver } from './aws/aws-driver';
import { GcpDriver } from './gcp/gcp-driver';

/**
 * Default registry implementation wired with the real AWS and GCP drivers.
 * Consumed by the server routes via constructor injection — any path that
 * instantiates this class ends up depending on `@aws-sdk/*` and
 * `google-auth-library`, so callers outside `apps/server` must not touch it.
 */
export class IntegrationProviderDriverRegistry extends IIntegrationProviderDriverRegistry {
  private readonly drivers: Record<
    IntegrationProvider,
    IIntegrationProviderDriver
  >;

  constructor(
    overrides: Partial<
      Record<IntegrationProvider, IIntegrationProviderDriver>
    > = {},
  ) {
    super();
    this.drivers = {
      aws: overrides.aws ?? new AwsDriver(),
      gcp: overrides.gcp ?? new GcpDriver(),
    };
  }

  public resolve(provider: IntegrationProvider): IIntegrationProviderDriver {
    const driver = this.drivers[provider];
    if (!driver) {
      throw new Error(`No driver registered for provider '${provider}'`);
    }
    return driver;
  }
}
