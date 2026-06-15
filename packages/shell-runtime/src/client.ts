import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useShellApp } from './context';
import {
  createConversationsResource,
  type ConversationsResource,
} from './resources/conversations';
import {
  createDatabasesResource,
  type DatabasesResource,
} from './resources/databases';
import {
  createPerformanceProfilesResource,
  type PerformanceProfilesResource,
} from './resources/performance-profiles';
import {
  createMessagesResource,
  type MessagesResource,
} from './resources/messages';
import {
  createNotebooksResource,
  type NotebooksResource,
} from './resources/notebooks';
import {
  createNodesResource,
  type NodesResource,
} from './resources/nodes';
import {
  createPoolsResource,
  type PoolsResource,
} from './resources/pools';
import {
  createFleetResource,
  type FleetResource,
} from './resources/fleet';
import {
  createDatasourcesResource,
  type DatasourcesResource,
} from './resources/datasources';
import {
  createIntegrationsResource,
  type IntegrationsHttpClient,
  type IntegrationsResource,
} from './resources/integrations';
import {
  createProjectsResource,
  type ProjectsResource,
} from './resources/projects';
import {
  createOrganizationsResource,
  type OrganizationsResource,
} from './resources/organizations';
import {
  createQueryResource,
  type QueryResource,
} from './resources/query';
import {
  createOrdersResource,
  type OrdersResource,
} from './resources/orders';
import {
  createTeamMembersResource,
  type TeamMembersResource,
} from './resources/team-members';
import {
  createUsageResource,
  type UsageResource,
} from './resources/usage';
import {
  createUserPreferencesResource,
  type UserPreferencesResource,
} from './resources/user-preferences';
import {
  createPersonalAccountResource,
  type PersonalAccountResource,
} from './resources/personal-account';
import { createMfaResource, type MfaResource } from './resources/mfa';
import {
  createPredictionsResource,
  type PredictionsResource,
} from './resources/predictions';

export type ShellClient = {
  /** Current project ID (from context). */
  projectId: string;
  /** Current project slug. */
  projectSlug: string;
  /** Current organization slug. */
  orgSlug: string;
  /** Current organization UUID (from context). */
  organizationId: string;

  databases: DatabasesResource;
  performanceProfiles: PerformanceProfilesResource;
  notebooks: NotebooksResource;
  nodes: NodesResource;
  pools: PoolsResource;
  fleet: FleetResource;
  conversations: ConversationsResource;
  messages: MessagesResource;
  datasources: DatasourcesResource;
  integrations: IntegrationsResource;
  projects: ProjectsResource;
  organizations: OrganizationsResource;
  query: QueryResource;
  userPreferences: UserPreferencesResource;
  personalAccount: PersonalAccountResource;
  mfa: MfaResource;
  teamMembers: TeamMembersResource;
  orders: OrdersResource;
  usage: UsageResource;
  predictions: PredictionsResource;
};

/**
 * Main data access hook for shell apps.
 *
 * Returns a typed, namespaced client for reading and writing data. The client
 * auto-injects the current project context and uses repositories from the
 * host app. Apps should use this instead of instantiating domain services
 * directly.
 *
 * @example
 * const shell = useShell();
 * const { data: notebooks } = useQuery({
 *   queryKey: shell.notebooks.keys.listByProject(),
 *   queryFn: () => shell.notebooks.list(),
 * });
 */
export function useShell(): ShellClient {
  const {
    projectId,
    projectSlug,
    orgSlug,
    organizationId,
    currentUserId,
    repositories,
    runQuery,
    testConnection,
    getDatasourceMetadata,
    predictionsClient,
  } = useShellApp();
  const queryClient = useQueryClient();

  return useMemo(() => {
    // Constructed up-front so `organizations.switchTo` can depend on it
    // via the `LastProjectResolver` structural type.
    const userPreferences = createUserPreferencesResource(
      repositories.userPreferences,
      repositories.project,
      queryClient,
      currentUserId,
    );

    return {
      projectId,
      projectSlug,
      orgSlug,
      organizationId,
      databases: createDatabasesResource(repositories.database, queryClient),
      performanceProfiles: createPerformanceProfilesResource(
        repositories.performanceProfile,
        organizationId,
        queryClient,
      ),
      notebooks: createNotebooksResource(
        repositories.notebook,
        projectId,
        queryClient,
      ),
      nodes: createNodesResource(repositories.node, projectId, queryClient),
      pools: createPoolsResource(repositories.pool, projectId, queryClient),
      fleet: createFleetResource(
        repositories.node,
        repositories.pool,
        projectId,
        queryClient,
      ),
      conversations: createConversationsResource(
        repositories.conversation,
        projectId,
        currentUserId,
        queryClient,
      ),
      messages: createMessagesResource(
        repositories.message,
        repositories.conversation,
        queryClient,
      ),
      datasources: createDatasourcesResource(
        repositories.datasource,
        projectId,
        currentUserId,
        queryClient,
        testConnection,
        getDatasourceMetadata,
      ),
      // The browser-side integration repository is an HTTP adapter with
      // DTO-shaped methods that aren't on the domain port. Cast through
      // `IntegrationsHttpClient` — the structural shape the resource needs.
      // Safe because `apps/web/src/lib/repositories/integration-connection.repository.ts`
      // (the concrete wired by `repositories-factory.ts`) implements every
      // method in that shape.
      integrations: createIntegrationsResource(
        repositories.integrationConnection as unknown as IntegrationsHttpClient,
        projectId,
        currentUserId,
        queryClient,
      ),
      projects: createProjectsResource(repositories.project, queryClient),
      organizations: createOrganizationsResource(
        repositories.organization,
        queryClient,
        repositories.project,
        userPreferences,
      ),
      query: createQueryResource(runQuery),
      userPreferences,
      personalAccount: createPersonalAccountResource(
        repositories.personalAccount,
        queryClient,
        currentUserId,
      ),
      mfa: createMfaResource(repositories.mfa, queryClient, currentUserId),
      teamMembers: createTeamMembersResource(
        repositories.teamMember,
        queryClient,
      ),
      orders: createOrdersResource(repositories.order, queryClient),
      usage: createUsageResource(repositories.usage, queryClient),
      predictions: createPredictionsResource(
        repositories.predictionSchemaSnapshot,
        repositories.predictionAgentConversation,
        repositories.predictionAgentMessage,
        // The host installs `predictionsClient` whenever the predictions
        // app is enabled. When absent, calling any predictions method
        // throws — matching the deferred-host pattern of integrations.
        predictionsClient ?? throwingPredictionsClient(),
        async (datasourceId) => {
          const datasource = await repositories.datasource.findById(datasourceId);
          if (!datasource) {
            throw new Error(`Datasource '${datasourceId}' not found.`);
          }
          const driverId = datasource.datasource_driver ?? datasource.datasource_provider;
          return getDatasourceMetadata({
            provider: datasource.datasource_provider,
            driverId,
            config: (datasource.config ?? {}) as Record<string, unknown>,
          });
        },
        queryClient,
      ),
    };
  }, [
      projectId,
      projectSlug,
      orgSlug,
      currentUserId,
      repositories,
      runQuery,
      testConnection,
      getDatasourceMetadata,
      predictionsClient,
      queryClient,
    ],
  );
}

function throwingPredictionsClient(): never {
  // Wrapped in a function so the throw fires lazily — only when the user
  // actually navigates to the predictions app without a host client wired.
  return new Proxy(
    {},
    {
      get(_target, prop) {
        return () => {
          throw new Error(
            `Predictions host client not provided to ShellAppProvider; cannot call '${String(prop)}'.`,
          );
        };
      },
    },
  ) as never;
}
