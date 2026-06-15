import {
  ExtensionScope,
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@qlm/extensions-sdk';
import { datasourceIconMapKeys } from '@qlm/ui/ai';

/**
 * Build the `pluginLogoMap` the QweryAgentUI consumes — a Map keyed by
 * normalized extension/driver ids (e.g. `postgresql`, `pgsql`,
 * `csv-online`, `csv_online`) → icon URL. Used by the datasource selector
 * to render the right brand icon next to each connected datasource.
 *
 * Returns a fresh Map on each call so React's `useMemo` can compare
 * inputs by reference. Cheap to build (O(extensions × driver-aliases)).
 */
export function buildPluginLogoMap(): Map<string, string> {
  const map = new Map<string, string>();
  const datasourceExtensions = ExtensionsRegistry.list<DatasourceExtension>(
    ExtensionScope.DATASOURCE,
  );
  for (const extension of datasourceExtensions) {
    if (!extension.icon) continue;
    const driverIds = (extension.drivers ?? []).map((d) => d.id);
    for (const key of datasourceIconMapKeys(extension.id, driverIds)) {
      map.set(key, extension.icon);
    }
  }
  return map;
}
