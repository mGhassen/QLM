import type { QueryClient } from '@tanstack/react-query';

import type {
  CredentialsInput,
  IntegrationConnectionOutput,
  Region,
  TestResult,
} from '@qlm/domain/usecases';

/**
 * Structural shape of the browser-side integrations HTTP client. The
 * `apps/web` `IntegrationConnectionHttpRepository` implements this shape
 * (plus the domain `IIntegrationConnectionRepository` port that the
 * `Repositories` bag type requires). Declared here because:
 *
 *  - The port type on `Repositories.integrationConnection` only exposes
 *    entity-shaped reads/writes, which are wrong for the browser flows
 *    (the browser never constructs a `secretRef`).
 *  - The shell resource needs the DTO-shaped wire API instead.
 *  - Defining the type here lets the resource depend only on domain DTOs,
 *    keeping `shell-runtime` free of an `apps/web` import.
 *
 * The shell `client.ts` bridges the two by casting
 * `repositories.integrationConnection` through this interface when
 * constructing the resource.
 */
export type IntegrationsHttpClient = {
  listByProject(projectId: string): Promise<IntegrationConnectionOutput[]>;
  getById(id: string): Promise<IntegrationConnectionOutput | null>;
  createIntegration(input: {
    projectId: string;
    name: string;
    credentials: CredentialsInput;
    createdBy: string;
  }): Promise<IntegrationConnectionOutput>;
  renameIntegration(
    id: string,
    input: { name?: string; updatedBy: string },
  ): Promise<IntegrationConnectionOutput>;
  rotateCredentials(
    id: string,
    input: { credentials: CredentialsInput; updatedBy: string },
  ): Promise<IntegrationConnectionOutput>;
  deleteIntegration(id: string): Promise<void>;
  runTest(id: string): Promise<TestResult>;
  runTestDraft(credentials: CredentialsInput): Promise<TestResult>;
  listRegionsById(id: string): Promise<Region[]>;
};

/**
 * Shell-runtime resource for the integrations feature.
 *
 * Phase-1 note: unlike `notebooks` / `datasources`, this resource does NOT
 * instantiate domain services. The services require a server-side secret
 * vault that the browser doesn't have. So every method is a thin wrapper
 * around the HTTP client, with React Query keys and invalidation helpers
 * for the plugin app to consume.
 *
 * Auto-injected context:
 *  - `projectId` → default for `list()` and `create()`
 *  - `currentUserId` → `createdBy` / `updatedBy` defaults
 */
export function createIntegrationsResource(
  client: IntegrationsHttpClient,
  currentProjectId: string,
  currentUserId: string,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['integrations'] as const,
    listByProject: (projectId: string = currentProjectId) =>
      ['integrations', 'project', projectId] as const,
    detail: (id: string) => ['integration', id] as const,
    regions: (id: string) => ['integration', id, 'regions'] as const,
  };

  return {
    keys,

    /** List integrations in a project. Defaults to the current project. */
    async list(
      params: { projectId?: string } = {},
    ): Promise<IntegrationConnectionOutput[]> {
      const pid = params.projectId ?? currentProjectId;
      return client.listByProject(pid);
    },

    /** Fetch a single integration by id. Returns `null` for 404. */
    async get(id: string): Promise<IntegrationConnectionOutput | null> {
      return client.getById(id);
    },

    /**
     * Create a new integration. Raw credentials are passed through to the
     * server over HTTPS and never touch the browser's Supabase client.
     * `projectId` and `createdBy` default to the current context.
     */
    async create(input: {
      name: string;
      credentials: CredentialsInput;
      projectId?: string;
      createdBy?: string;
    }): Promise<IntegrationConnectionOutput> {
      return client.createIntegration({
        projectId: input.projectId ?? currentProjectId,
        name: input.name,
        credentials: input.credentials,
        createdBy: input.createdBy ?? currentUserId,
      });
    },

    /** Rename (non-secret update). `updatedBy` defaults to the current user. */
    async rename(
      id: string,
      input: { name: string; updatedBy?: string },
    ): Promise<IntegrationConnectionOutput> {
      return client.renameIntegration(id, {
        name: input.name,
        updatedBy: input.updatedBy ?? currentUserId,
      });
    },

    /**
     * Rotate credentials. Resets test state to `untested` on the server;
     * the caller should re-test explicitly if they want a green pill.
     */
    async rotateCredentials(
      id: string,
      input: { credentials: CredentialsInput; updatedBy?: string },
    ): Promise<IntegrationConnectionOutput> {
      return client.rotateCredentials(id, {
        credentials: input.credentials,
        updatedBy: input.updatedBy ?? currentUserId,
      });
    },

    /** Delete the row and best-effort forget its vault handle. */
    async delete(id: string): Promise<void> {
      return client.deleteIntegration(id);
    },

    /**
     * Run a connection test against the stored credentials. Updates the
     * row's `testStatus` / `testIdentity` / `testError` / `testedAt`
     * server-side; callers should invalidate the `detail(id)` query
     * afterwards to pick up the new state.
     */
    async test(id: string): Promise<TestResult> {
      return client.runTest(id);
    },

    /**
     * Dry test — validate a credentials payload BEFORE persisting.
     * Used by the create form's "Test connection" button so users can
     * verify credentials before committing to a row.
     */
    async testDraft(credentials: CredentialsInput): Promise<TestResult> {
      return client.runTestDraft(credentials);
    },

    /** Live region list. Never persisted — always fetched from the provider. */
    async listRegions(id: string): Promise<Region[]> {
      return client.listRegionsById(id);
    },

    /**
     * React Query invalidation helpers. Plugin-app mutations call these in
     * their `onSuccess` so the table / detail view refetch automatically.
     */
    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      list: (projectId?: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.listByProject(projectId),
        }),
      detail: (id: string) =>
        queryClient.invalidateQueries({ queryKey: keys.detail(id) }),
      regions: (id: string) =>
        queryClient.invalidateQueries({ queryKey: keys.regions(id) }),
    },
  };
}

export type IntegrationsResource = ReturnType<typeof createIntegrationsResource>;
