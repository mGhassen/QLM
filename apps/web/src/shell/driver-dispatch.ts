import type { DatasourceMetadata } from '@qlm/domain/entities';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
  type DriverExtension,
} from '@qlm/extensions-sdk';
import { getDriverInstance } from '@qlm/extensions-loader';
import type {
  GetDatasourceMetadataFn,
  TestConnectionFn,
} from '@qlm/shell-runtime';

import { driverCommand } from '@/lib/repositories/api-client';

/**
 * Host-side dispatcher that routes driver commands (test connection,
 * metadata fetch) to the right runtime:
 *
 *   - **browser** drivers (`duckdb-wasm`, `pglite`, `csv-online`, ...)
 *     are loaded client-side via `@qlm/extensions-loader`'s
 *     `getDriverInstance` and called in-process. No network hop.
 *
 *   - **node** drivers (`postgresql`, `mysql`, `clickhouse-node`, ...)
 *     are delegated to the server's `POST /driver/command` endpoint
 *     (`apps/server/src/routes/driver.ts`), which loads the driver on
 *     the server and calls the same method.
 *
 * `testConnection` used to be a no-op stub here that returned
 * `{ ok: true }` unconditionally — false positives on every click.
 * `getDatasourceMetadata` used to not exist at all; the datasource
 * detail page's Tables and Schema tabs received `metadata={null}` and
 * always showed the "Failed to load" fallback branch. Both pieces of
 * plumbing are closed by this helper.
 */

function resolveDriver(
  provider: string,
  driverId: string,
): DriverExtension | null {
  const extension = ExtensionsRegistry.get<DatasourceExtension>(provider);
  if (!extension) return null;
  const match = extension.drivers?.find((d) => d.id === driverId);
  return match ?? extension.drivers?.[0] ?? null;
}

/**
 * Runs `testConnection` against the appropriate runtime. Always
 * resolves — errors are caught and returned in `{ ok: false, error }`
 * shape expected by the UI.
 */
export const testDatasourceConnection: TestConnectionFn = async ({
  provider,
  driverId,
  config,
}) => {
  const driver = resolveDriver(provider, driverId);
  if (!driver) {
    return {
      ok: false,
      error: `Driver ${provider}/${driverId} not found in the extensions registry`,
    };
  }

  try {
    if (driver.runtime === 'browser') {
      const instance = await getDriverInstance(driver, {
        config,
        runtime: 'browser',
      });
      await instance.testConnection();
      return { ok: true };
    }

    // node runtime — delegate to the server route.
    await driverCommand('testConnection', {
      datasourceProvider: provider,
      driverId: driver.id,
      config,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Fetches metadata (schemas / tables / columns / relationships) for a
 * datasource via the appropriate runtime. Throws on failure — callers
 * (React Query hooks) translate that into `isError` state.
 */
export const getDatasourceMetadata: GetDatasourceMetadataFn = async ({
  provider,
  driverId,
  config,
}) => {
  const driver = resolveDriver(provider, driverId);
  if (!driver) {
    throw new Error(
      `Driver ${provider}/${driverId} not found in the extensions registry`,
    );
  }

  if (driver.runtime === 'browser') {
    const instance = await getDriverInstance(driver, {
      config,
      runtime: 'browser',
    });
    return instance.metadata();
  }

  // node runtime — delegate to the server route.
  return driverCommand<DatasourceMetadata>('metadata', {
    datasourceProvider: provider,
    driverId: driver.id,
    config,
  });
};
