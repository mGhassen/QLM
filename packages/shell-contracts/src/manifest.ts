/** Which shell context the plugin belongs to. */
export type Layer = 'organization' | 'project';

/** Where a plugin's nav entry renders. */
export type NavSlot =
  | 'organization.sidebar'
  | 'project.topLevelNav'
  | 'project.overflow';

/** Id of a top-level project shell bucket (Ops, Database, …). */
export type ProjectShellBucketId =
  | 'dashboard'
  | 'ops'
  | 'database'
  | 'migration'
  | 'advisory'
  | 'compliance'
  | 'data'
  | 'ai'
  | 'artefacts'
  | 'project-settings'
  | 'user-settings';

export interface NavSecondaryItem {
  label: string;
  path: string;
  icon?: string;
}

/**
 * A flat short URL contributed by an app, e.g. `/notebook/my-slug`.
 * The web app's flat catch-all route delegates to apps by matching `prefix`
 * against the first URL segment.
 */
export interface FlatRouteDef {
  /** URL prefix at the root level (e.g. 'notebook' for `/notebook/{slug}`). */
  prefix: string;
  /**
   * Parameter names extracted from the URL after the prefix.
   * Example: `['notebookSlug']` means the URL is `/{prefix}/{notebookSlug}`.
   * Empty array means it's just `/{prefix}` with no params.
   */
  params: string[];
}

export interface PluginManifest {
  id: string;
  version: string;
  displayName: string;
  description?: string;
  /** Icon key (lucide icon name, e.g. "LayoutDashboard"). */
  icon?: string;
  layer: Layer;

  nav: {
    slot?: NavSlot;
    parentAppId?: string;
    primary: {
      label: string;
      icon?: string;
      order: number;
      section?: string;
    };
    secondary?: NavSecondaryItem[];
  };

  /** URL segment after the project slug (e.g. "dashboard"). */
  routeBase: string;

  /**
   * Flat short URLs this app contributes (e.g. two routes for list + detail).
   * Preferred over `flatRoute` when the app needs more than one flat URL.
   * The catch-all `$flatPrefix.$.tsx` dispatches to the matching FlatRoot
   * component from the plugin-root's `FlatRoots` export.
   */
  flatRoutes?: FlatRouteDef[];

  /**
   * @deprecated Use `flatRoutes` instead. Kept for backwards compatibility with
   * existing app manifests that contribute exactly one flat route.
   */
  flatRoute?: FlatRouteDef;

  // Project-layer only
  projectTopLevelAppBucketId?: ProjectShellBucketId;
  projectNavGroupTitle?: string;

  // Organization-layer only
  organizationSidebar?: {
    mode: 'full-page' | 'overlay';
    defaultSectionSlug?: string;
  };
  defaultOrganizationLanding?: boolean;

  // Gating
  enabled?: boolean;
  requiredPermissions?: string[];
  featureFlags?: string[];
}
