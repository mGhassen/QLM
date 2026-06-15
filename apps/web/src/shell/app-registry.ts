import {
  createElement,
  lazy,
  type LazyExoticComponent,
  type ComponentType,
  type ReactElement,
} from 'react';

import type { PluginManifest } from '@guepard/shell-contracts';
import type { Repositories } from '@guepard/domain/repositories';
import type {
  SidebarAppGroup,
  SidebarAppItem,
  SidebarPinnedItem,
} from '@guepard/ui/shell';

/**
 * Function exported by an app's plugin-root to resolve project context
 * from flat URL params (e.g., fetch a notebook by slug to get its projectId).
 */
export type ResolveProjectContextFn = (
  params: Record<string, string>,
  api: { repositories: Repositories },
) => Promise<{ projectId: string; tabId?: string } | null>;

/** The shape of an app's plugin-root module. */
type PluginRootModule = {
  default: ComponentType;
  /** @deprecated Single flat-route component. Use `FlatRoots` for multi-route apps. */
  FlatRoot?: ComponentType;
  /**
   * Multi-route flat-root components keyed by URL prefix.
   * Used when the manifest declares `flatRoutes: FlatRouteDef[]`.
   * Example: `{ databases: ListRoot, database: DetailRoot }`.
   */
  FlatRoots?: Record<string, ComponentType>;
  resolveProjectContext?: ResolveProjectContextFn;
  /**
   * Contextual help pages the plugin registers with the shell's docs
   * panel. Keys are stable page ids; values are plain React components
   * rendered inside the panel body when a plugin calls
   * `useDocsPanel().open(pageId)`.
   *
   * Eager-imported alongside `FlatRoot` / `resolveProjectContext` so
   * the host can look up `(routeBase, pageId) → ComponentType` at
   * render time without a dynamic import.
   */
  HelpPages?: Record<string, ComponentType>;
  /**
   * Suggested prompts shown in the Qwery Agent panel's empty state when
   * this plugin is the active route. Mirrors the `HelpPages` pattern —
   * optional sibling export, discovered at registry build time. When
   * undefined the shell falls back to `DEFAULT_SUGGESTED_PROMPTS`.
   */
  SuggestedPrompts?: string[];
};

// ---------------------------------------------------------------------------
// Vite glob discovery — no codegen needed.
// Manifests and plugin roots are discovered from app packages.
// Apps are self-contained: manifest + plugin-root live in the same package.
// ---------------------------------------------------------------------------

const manifestModules = import.meta.glob<{ manifest: PluginManifest }>(
  '../../../../packages/apps/*/src/manifest.ts',
  { eager: true },
);

// Eagerly loaded so we can access named exports (FlatRoot, resolveProjectContext)
// at registry build time. The main `Root` is still lazy via React.lazy.
const pluginRootModules = import.meta.glob<PluginRootModule>(
  '../../../../packages/apps/*/src/plugin-root.tsx',
  { eager: true },
);

// Lazy loaders for the main Root (so the initial bundle doesn't include app code)
const pluginRootLazyLoaders = import.meta.glob<PluginRootModule>(
  '../../../../packages/apps/*/src/plugin-root.tsx',
);

// ---------------------------------------------------------------------------
// Registry entry
// ---------------------------------------------------------------------------

export type PluginRegistryEntry = {
  manifest: PluginManifest;
  Root: LazyExoticComponent<ComponentType>;
  /** @deprecated Use `flatRoots` for multi-route apps. */
  FlatRoot?: LazyExoticComponent<ComponentType>;
  /** Maps URL prefix → lazy flat-root component. Populated from `FlatRoots` or synthesized from `FlatRoot`. */
  flatRoots?: Map<string, LazyExoticComponent<ComponentType>>;
  resolveProjectContext?: ResolveProjectContextFn;
  /**
   * Map of help-page id → component, copied verbatim from the plugin-root
   * module's `HelpPages` named export. Empty/undefined when the plugin
   * doesn't contribute any help pages.
   */
  helpPages?: Record<string, ComponentType>;
  /**
   * Plugin-contributed prompts shown in the Qwery Agent panel's empty
   * state when this plugin is the active route. Copied verbatim from
   * the plugin-root module's `SuggestedPrompts` named export.
   */
  suggestedPrompts?: string[];
};

function buildEntries(): PluginRegistryEntry[] {
  return Object.entries(manifestModules).map(([path, mod]) => {
    const rootPath = path.replace('manifest.ts', 'plugin-root.tsx');
    const rootModule = pluginRootModules[rootPath];
    const lazyLoader = pluginRootLazyLoaders[rootPath];

    const Root = lazyLoader
      ? lazy(lazyLoader)
      : lazy(() => Promise.resolve({ default: () => null }));

    const FlatRoot = rootModule?.FlatRoot
      ? lazy(async () => {
          const loaded = await lazyLoader!();
          return { default: loaded.FlatRoot! };
        })
      : undefined;

    // Build the prefix → LazyComponent map.
    // New style: plugin-root exports `FlatRoots: Record<string, ComponentType>`.
    // Old style: plugin-root exports `FlatRoot` + manifest has `flatRoute`.
    let flatRoots: Map<string, LazyExoticComponent<ComponentType>> | undefined;

    if (rootModule?.FlatRoots) {
      flatRoots = new Map();
      for (const prefix of Object.keys(rootModule.FlatRoots)) {
        const capturedPrefix = prefix;
        flatRoots.set(
          capturedPrefix,
          lazy(async () => {
            const loaded = await lazyLoader!();
            return { default: loaded.FlatRoots![capturedPrefix]! };
          }),
        );
      }
    } else if (FlatRoot && mod.manifest.flatRoute) {
      flatRoots = new Map([[mod.manifest.flatRoute.prefix, FlatRoot]]);
    }

    return {
      manifest: mod.manifest,
      Root,
      FlatRoot,
      flatRoots,
      resolveProjectContext: rootModule?.resolveProjectContext,
      helpPages: rootModule?.HelpPages,
      suggestedPrompts: rootModule?.SuggestedPrompts,
    };
  });
}

/**
 * Shell-level fallback prompts shown in the Qwery Agent panel's empty state
 * when the active route's plugin doesn't contribute any. Kept short and
 * generic so it's usable on any route.
 */
const DEFAULT_SUGGESTED_PROMPTS: readonly string[] = [
  'What can Qwery Agent help me with?',
  "Explain what I'm looking at",
  'Show me usage in this project',
];

// ---------------------------------------------------------------------------
// AppRegistry
// ---------------------------------------------------------------------------

/** Category labels for bucket IDs used in sidebar group headings. */
const BUCKET_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  ops: 'Ops',
  database: 'Database',
  migration: 'Migration',
  advisory: 'Advisory',
  compliance: 'Compliance',
  data: 'Data',
  ai: 'AI',
  artefacts: 'Artefacts',
  'project-settings': 'Settings',
  'user-settings': 'Settings',
};

/** Order in which bucket groups appear in the sidebar. */
const BUCKET_ORDER: string[] = [
  'ops',
  'database',
  'migration',
  'advisory',
  'compliance',
  'data',
  'ai',
  'artefacts',
  'project-settings',
  'user-settings',
];

export class AppRegistry {
  private entries: PluginRegistryEntry[];

  constructor(entries: PluginRegistryEntry[]) {
    this.entries = entries.filter((e) => e.manifest.enabled !== false);
  }

  /** All active project-layer apps. */
  getProjectApps(): PluginRegistryEntry[] {
    return this.entries.filter((e) => e.manifest.layer === 'project');
  }

  /** Find a plugin by its route base. */
  getByRouteBase(routeBase: string): PluginRegistryEntry | undefined {
    return this.entries.find((e) => e.manifest.routeBase === routeBase);
  }

  /** Find a plugin by manifest id (e.g. `studio`, `dashboard`). */
  getByManifestId(id: string): PluginRegistryEntry | undefined {
    return this.entries.find((e) => e.manifest.id === id);
  }

  /** Find a plugin that contributes a flat route with the given prefix. Checks `flatRoutes[]` first, then the deprecated `flatRoute`. */
  getByFlatPrefix(prefix: string): PluginRegistryEntry | undefined {
    return this.entries.find((e) => {
      if (e.manifest.flatRoutes?.some((r) => r.prefix === prefix)) return true;
      return e.manifest.flatRoute?.prefix === prefix;
    });
  }

  /** Return the lazy flat-root component for the given prefix, or undefined if not found. */
  getFlatRoot(prefix: string): LazyExoticComponent<ComponentType> | undefined {
    const entry = this.getByFlatPrefix(prefix);
    return entry?.flatRoots?.get(prefix) ?? entry?.FlatRoot;
  }

  /**
   * Render the flat-root component for the given prefix as a React element,
   * or `null` if the plugin does not declare one. Returning an element
   * (rather than a component) keeps the dynamic plugin lookup off the JSX
   * path, satisfying `react-hooks/static-components`.
   */
  renderFlatRoot(prefix: string): ReactElement | null {
    const Component = this.getFlatRoot(prefix);
    return Component ? createElement(Component) : null;
  }

  /** Return the param names for the flat route with the given prefix. */
  getFlatRouteParams(prefix: string): string[] {
    const entry = this.getByFlatPrefix(prefix);
    const fromArray = entry?.manifest.flatRoutes?.find(
      (r) => r.prefix === prefix,
    );
    if (fromArray) return fromArray.params ?? [];
    return entry?.manifest.flatRoute?.prefix === prefix
      ? (entry.manifest.flatRoute.params ?? [])
      : [];
  }

  /**
   * Resolve a help-page component by the app's route base and the
   * page id the plugin passed to `useDocsPanel().open()`. Returns
   * `null` when the plugin doesn't declare that id (either because
   * the page doesn't exist, the plugin isn't registered, or the
   * plugin was disabled by the feature flag).
   */
  getHelpPage(routeBase: string, pageId: string): ComponentType | null {
    const entry = this.getByRouteBase(routeBase);
    return entry?.helpPages?.[pageId] ?? null;
  }

  /**
   * Resolve suggested prompts for the Qwery Agent panel's empty state.
   * Returns the active plugin's `SuggestedPrompts` when defined, else the
   * shell-level default list. Safe to call with `null` / unknown routeBase.
   */
  getSuggestedPrompts(routeBase: string | null): string[] {
    if (routeBase) {
      const entry = this.getByRouteBase(routeBase);
      if (entry?.suggestedPrompts && entry.suggestedPrompts.length > 0) {
        return [...entry.suggestedPrompts];
      }
    }
    return [...DEFAULT_SUGGESTED_PROMPTS];
  }

  /**
   * Default routeBase the project shell should redirect to when loaded
   * without a specific app in the URL. Returns the first pinned item
   * (typically "dashboard"), falling back to the first project app.
   * Always returns a routeBase that {@link getByRouteBase} can resolve.
   */
  getDefaultRouteBase(): string {
    const pinned = this.getPinnedItems();
    if (pinned.length > 0) {
      const entry = this.getByManifestId(pinned[0]!.id);
      if (entry) return entry.manifest.routeBase;
    }
    const first = this.getProjectApps()[0];
    if (first) return first.manifest.routeBase;
    throw new Error('No enabled project apps are registered in the shell.');
  }

  /**
   * Pinned items for the sidebar (apps in the "dashboard" bucket).
   * These appear above the Apps section.
   */
  getPinnedItems(): SidebarPinnedItem[] {
    return this.getProjectApps()
      .filter((e) => e.manifest.projectTopLevelAppBucketId === 'dashboard')
      .sort(
        (a, b) => a.manifest.nav.primary.order - b.manifest.nav.primary.order,
      )
      .map((e) => ({
        id: e.manifest.id,
        label: e.manifest.displayName,
        icon: e.manifest.icon ?? 'LayoutDashboard',
      }));
  }

  /**
   * Derive sidebar app groups from manifests.
   * Groups apps by `projectTopLevelAppBucketId`, sorted by `BUCKET_ORDER`,
   * items sorted by `nav.primary.order`.
   */
  getNavGroups(): SidebarAppGroup[] {
    const apps = this.getProjectApps().filter(
      (e) =>
        e.manifest.projectTopLevelAppBucketId !== 'dashboard' &&
        e.manifest.nav.slot !== 'project.overflow',
    );

    const grouped = new Map<string, SidebarAppItem[]>();

    for (const entry of apps) {
      const bucketId = entry.manifest.projectTopLevelAppBucketId ?? 'artefacts';
      if (!grouped.has(bucketId)) {
        grouped.set(bucketId, []);
      }
      grouped.get(bucketId)!.push({
        id: entry.manifest.id,
        label: entry.manifest.displayName,
        icon: entry.manifest.icon ?? 'Package',
      });
    }

    // Sort items within each group by nav order
    for (const items of grouped.values()) {
      items.sort((a, b) => {
        const entryA = this.entries.find((e) => e.manifest.id === a.id);
        const entryB = this.entries.find((e) => e.manifest.id === b.id);
        return (
          (entryA?.manifest.nav.primary.order ?? 0) -
          (entryB?.manifest.nav.primary.order ?? 0)
        );
      });
    }

    // Build groups in bucket order
    const groups: SidebarAppGroup[] = [];
    for (const bucketId of BUCKET_ORDER) {
      const items = grouped.get(bucketId);
      if (items && items.length > 0) {
        groups.push({
          title: BUCKET_LABELS[bucketId] ?? bucketId,
          items,
        });
      }
    }

    return groups;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: AppRegistry | null = null;

export function getAppRegistry(): AppRegistry {
  if (!instance) {
    instance = new AppRegistry(buildEntries());
  }
  return instance;
}
