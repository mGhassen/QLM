import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

import type { Repositories } from '@guepard/domain/repositories';
import type {
  DatasourceMetadata,
  DatasourceResultSet,
} from '@guepard/domain/entities';
import { getLogger } from '@guepard/shared/logger';

/**
 * Host-provided function that executes a SQL query against a datasource.
 * The implementation lives in the host (web app) because it uses host-specific
 * infrastructure (extensions registry, browser drivers, API client).
 */
export type RunQueryFn = (input: {
  query: string;
  datasourceId: string;
  conversationId?: string;
}) => Promise<DatasourceResultSet>;

/** Result of a datasource connection test. */
export type TestConnectionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Host-provided function that tests a datasource connection. The host
 * decides how to run the test — client-side driver for browser-runtime
 * extensions, `POST /driver/command` for node-runtime extensions.
 *
 * `provider` is the datasource extension id (e.g. `'postgresql'`); the
 * host uses it to look up the extension's driver list and pick the
 * runtime.
 */
export type TestConnectionFn = (input: {
  provider: string;
  driverId: string;
  config: Record<string, unknown>;
}) => Promise<TestConnectionResult>;

/**
 * Host-provided function that fetches a datasource's schema metadata
 * (schemas, tables, columns, relationships). Same dispatch contract as
 * `TestConnectionFn` — browser drivers run in-process, node drivers go
 * through the server's `POST /driver/command` endpoint.
 */
export type GetDatasourceMetadataFn = (input: {
  provider: string;
  driverId: string;
  config: Record<string, unknown>;
}) => Promise<DatasourceMetadata>;

/**
 * Host-provided HTTP shape for the Predictions app (RFC 0030). The
 * concrete shape lives next to the resource that consumes it; this
 * re-export keeps the import surface flat for hosts that wire context.
 */
export type { PredictionsHttpClient as PredictionsHostClient } from './resources/predictions';

/**
 * Context provided by the host app (apps/web) to all shell apps.
 * Holds the current project/org context, repositories, and host-provided
 * runtime capabilities (query execution, connection testing, metadata).
 */
export type ShellAppContextValue = {
  projectId: string;
  projectSlug: string;
  orgSlug: string;
  organizationId: string;
  /** ID of the currently authenticated user. Used for `createdBy` / `updatedBy`. */
  currentUserId: string;
  /**
   * When `false`, skip the best-effort last-project preference write until
   * the host confirms a bearer token is available for HTTP repositories.
   */
  authReady?: boolean;
  repositories: Repositories;
  runQuery: RunQueryFn;
  testConnection: TestConnectionFn;
  getDatasourceMetadata: GetDatasourceMetadataFn;
  /**
   * Optional host client for the Predictions app. When omitted, the
   * predictions resource on the shell client will throw if used. Hosts
   * that ship `@guepard/app-predictions` MUST provide this.
   */
  predictionsClient?: import('./resources/predictions').PredictionsHttpClient;
  /** Optional project-shell tab controls (provided by apps/web host). */
  projectTabs?: {
    closeTab: (tabId: string) => void;
  };
};

const ShellAppContext = createContext<ShellAppContextValue | null>(null);

export function ShellAppProvider({
  value,
  children,
}: {
  value: ShellAppContextValue;
  children: ReactNode;
}) {
  const { organizationId, orgSlug, projectId, currentUserId, authReady, repositories } =
    value;

  // Pin `repositories` through a ref so the effect below depends only on
  // the identity of `{orgSlug, projectId, currentUserId}`. Without this,
  // any rerender with a freshly-built value object would re-fire the
  // write even though the user hasn't navigated.
  const reposRef = useRef(repositories);
  reposRef.current = repositories;

  // Fire-and-forget: record the user's last project for this org so the
  // topbar's org-switcher can land them here next time. Read-merge-patch
  // is inlined because jsonb `||` is shallow — a single-key patch would
  // drop every other org's last-project entry. Errors are logged and
  // swallowed: this is UX polish, not a correctness path.
  useEffect(() => {
    if (
      !organizationId ||
      !projectId ||
      !currentUserId ||
      authReady === false
    ) {
      return;
    }

    void (async () => {
      try {
        const repo = reposRef.current.userPreferences;
        const current = await repo.get(currentUserId);
        const existing = current?.preferences.last_project_by_org ?? {};
        await repo.patch(currentUserId, {
          last_project_by_org: { ...existing, [organizationId]: projectId },
        });
      } catch (error) {
        const logger = await getLogger();
        logger.warn(
          { err: error, orgSlug, organizationId, projectId },
          'Failed to record last-project preference (ignored).',
        );
      }
    })();
  }, [organizationId, orgSlug, projectId, currentUserId, authReady]);

  return (
    <ShellAppContext.Provider value={value}>
      {children}
    </ShellAppContext.Provider>
  );
}

/** Raw context accessor — prefer `useShell()` for typed data access. */
export function useShellApp(): ShellAppContextValue {
  const ctx = useContext(ShellAppContext);
  if (!ctx) {
    throw new Error(
      'useShellApp must be used inside a ShellAppProvider (from the host app)',
    );
  }
  return ctx;
}
