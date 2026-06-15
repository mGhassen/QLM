import {
  datasources,
  ExtensionsRegistry,
  ExtensionScope,
  type DatasourceExtension,
  type DriverContext,
  type DriverExtension,
  type DriverFactory,
} from '@qlm/extensions-sdk';

import registryJson from './registry.json';

type BundledDriverEntry = {
  id: string;
  name: string;
  description?: string;
  runtime?: DriverExtension['runtime'];
  entry?: string;
};

type BundledDatasourceEntry = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  tags?: string[];
  schema?: unknown;
  docsUrl?: string | null;
  supportsPreview?: boolean;
  previewUrlKind?: DatasourceExtension['previewUrlKind'];
  previewDataFormat?: DatasourceExtension['previewDataFormat'];
  drivers?: BundledDriverEntry[];
};

type BundledRegistry = {
  datasources?: BundledDatasourceEntry[];
};

let initialized = false;

/**
 * Populate the extensions registry with all datasource extensions from the
 * bundled registry.json. Safe to call multiple times — idempotent.
 * Call this once on app boot before rendering the datasources UI so that
 * `ExtensionsRegistry.list('datasource')` returns the available connectors.
 */
export function initDatasourceRegistry(): void {
  if (initialized) return;
  initialized = true;
  const bundled = registryJson as BundledRegistry;
  const datasourceEntries = bundled.datasources ?? [];
  for (const ds of datasourceEntries) {
    const extension: DatasourceExtension = {
      id: ds.id,
      name: ds.name,
      icon: ds.icon ?? '',
      description: ds.description,
      tags: ds.tags,
      scope: ExtensionScope.DATASOURCE,
      schema: ds.schema ?? null,
      docsUrl: ds.docsUrl ?? null,
      supportsPreview: ds.supportsPreview === true,
      previewUrlKind: ds.previewUrlKind,
      previewDataFormat: ds.previewDataFormat,
      drivers: (ds.drivers ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        runtime: d.runtime,
        entry: d.entry,
      })),
    };
    ExtensionsRegistry.register(extension);
  }
}

type DriverModule = {
  driverFactory?: unknown;
  default?: unknown;
  [key: string]: unknown;
};

function getDriverFactoryFromModule(mod: DriverModule): unknown {
  const m = mod as Record<string, unknown>;
  const factory = m.driverFactory ?? m.default;
  return typeof factory === 'function' ? factory : undefined;
}

const loadedDrivers = new Set<string>();

/**
 * Get all registered node driver IDs
 * In the browser, we don't have a pre-filled map of node drivers, so this returns empty or checks what's loaded.
 * For now matching the node implementation signature.
 */
export function getNodeDriverIds(): string[] {
  return [];
}

/**
 * Get a driver instance from the registry.
 * Loads and registers the driver if not already loaded.
 */
export async function getDriverInstance(
  driver: DriverExtension,
  context: DriverContext,
): Promise<ReturnType<DriverFactory>> {
  let factory = datasources.getDriverRegistration(driver.id)?.factory;
  if (factory) {
    const driverContext: DriverContext = {
      ...context,
      runtime: context.runtime ?? driver.runtime,
    };
    return factory(driverContext);
  }

  if (!loadedDrivers.has(driver.id)) {
    loadedDrivers.add(driver.id);
    try {
      let mod: DriverModule;

      if (driver.runtime === 'node') {
        throw new Error(
          `Driver ${driver.id} is a Node.js driver and cannot be loaded in the browser.`,
        );
      } else {
        const entry = driver.entry ?? './dist/driver.js';
        const fileName = entry.split(/[/\\]/).pop() || 'driver.js';
        const url = `${window.location.origin}/extensions/${driver.id}/${fileName}`;
        // Verify if we can just use dynamic import with a variable
        const dynamicImport = new Function('url', 'return import(url)');
        mod = await dynamicImport(url);
      }

      const driverFactory = getDriverFactoryFromModule(mod);

      if (typeof driverFactory === 'function') {
        factory = driverFactory as DriverFactory;
        datasources.registerDriver(
          driver.id,
          factory,
          driver.runtime ?? 'node',
        );
      } else {
        throw new Error(
          `Driver ${driver.id} did not export a driverFactory or default function`,
        );
      }
    } catch (err) {
      loadedDrivers.delete(driver.id);
      throw err;
    }
  }

  if (!factory) {
    throw new Error(`Driver ${driver.id} did not register a factory`);
  }

  const driverContext: DriverContext = {
    ...context,
    runtime: context.runtime ?? driver.runtime,
  };
  return factory(driverContext);
}

/**
 * Load the Zod schema for a datasource extension.
 * Tries to load from the 'schema' property if it's an object/schema.
 * If it's a string or undefined, tries to load from the convention path /extensions/<id>/schema.js
 */
export async function loadExtensionSchema(
  extensionId: string,
  schema?: unknown,
): Promise<unknown> {
  // If schema is already an object (zod schema), return it
  if (schema && typeof schema === 'object') {
    return schema;
  }

  // If schema is a string, it might be a path, but we enforce convention for now
  // or if it's missing, we try to load from convention
  try {
    const url = `${window.location.origin}/extensions/${extensionId}/schema.js`;
    // Dynamic import the schema file
    const dynamicImport = new Function('url', 'return import(url)');
    const mod = await dynamicImport(url);
    return mod.schema || mod.default;
  } catch (error) {
    console.warn(`Failed to load schema for extension ${extensionId}:`, error);
    return undefined;
  }
}
