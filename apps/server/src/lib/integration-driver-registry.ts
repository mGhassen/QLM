import type { IIntegrationProviderDriverRegistry } from '@qlm/domain/services';
import { IntegrationProviderDriverRegistry } from '@qlm/integrations-drivers';

let cached: IIntegrationProviderDriverRegistry | null = null;

/**
 * Lazy process-wide singleton for the concrete driver registry. Tests
 * should construct their own `IntegrationProviderDriverRegistry` with
 * stub drivers and pass it to `createApp` / `createIntegrationsRoutes`
 * instead of calling this.
 */
export function createServerDriverRegistry(): IIntegrationProviderDriverRegistry {
  if (cached === null) {
    cached = new IntegrationProviderDriverRegistry();
  }
  return cached;
}
