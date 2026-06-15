import type { QueryClient } from '@tanstack/react-query';

import type {
  NodeDrain,
  NodeEligibility,
  NodeLifecycleState,
} from '@qlm/domain/entities';
import type { INodeRepository } from '@qlm/domain/repositories';
import {
  BulkDeleteNodesService,
  CreateNodeService,
  DeleteNodeService,
  DrainCancelNodeService,
  DrainNodeService,
  GetNodeMetricsService,
  GetNodeService,
  ListNodesByProjectService,
  SetNodeEligibilityService,
  SetNodeLifecycleService,
  UpdateNodeService,
} from '@qlm/domain/services';
import type {
  BulkResult,
  CreateNodeInput,
  ListNodesInput,
  ListNodesOutput,
  MetricsPoint,
  MetricsRange,
  NodeOutput,
  UpdateNodeInput,
} from '@qlm/domain/usecases';

export function createNodesResource(
  repository: INodeRepository,
  currentProjectId: string,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['nodes'] as const,
    listByProject: (
      projectId: string = currentProjectId,
      input?: Omit<ListNodesInput, 'projectId'>,
    ) =>
      input
        ? (['nodes', 'project', projectId, input] as const)
        : (['nodes', 'project', projectId] as const),
    detail: (id: string) => ['nodes', 'detail', id] as const,
    metrics: (id: string, range: MetricsRange) =>
      ['nodes', 'metrics', id, range] as const,
  };

  // Cross-resource invalidator. Pool aggregations are computed by the SQL
  // pool_view — every five-axis mutation must re-fetch fleet.*, otherwise
  // distribution bars / pressure lists go stale.
  // listByProject is intentionally excluded: optimistic patches in use-data.ts
  // set the list cache directly; invalidating the list before the server
  // response arrives destroys those patches. onSettled in use-data.ts handles
  // the granular detail refresh instead.
  async function invalidateAfterMutation(id: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.detail(id) }),
      queryClient.invalidateQueries({ queryKey: ['fleet'] as const }),
    ]);
  }

  return {
    keys,

    async list(
      params: Omit<ListNodesInput, 'projectId'> & { projectId?: string } = {},
    ): Promise<ListNodesOutput> {
      const { projectId, ...rest } = params;
      return new ListNodesByProjectService(repository).execute({
        projectId: projectId ?? currentProjectId,
        ...rest,
      });
    },

    async get(id: string): Promise<NodeOutput> {
      return new GetNodeService(repository).execute(id);
    },

    async create(
      input: Omit<CreateNodeInput, 'projectId'> & { projectId?: string },
    ): Promise<NodeOutput> {
      return new CreateNodeService(repository).execute({
        projectId: input.projectId ?? currentProjectId,
        name: input.name,
        kind: input.kind,
        region: input.region,
        cpuCores: input.cpuCores,
        memoryGb: input.memoryGb,
        tags: input.tags,
        provider: input.provider,
        cluster: input.cluster,
        ip: input.ip,
        owner: input.owner,
      });
    },

    async update(input: UpdateNodeInput): Promise<NodeOutput> {
      return new UpdateNodeService(repository).execute(input);
    },

    async delete(id: string): Promise<boolean> {
      return new DeleteNodeService(repository).execute(id);
    },

    async bulkDelete(ids: string[]): Promise<BulkResult> {
      return new BulkDeleteNodesService(repository).execute({ ids });
    },

    // ─── RFC 0026 5-axis state mutations ───────────────────────────────────
    //
    // Each one fans out to nodes.list / nodes.detail / fleet.* — pool
    // aggregations depend on every five-axis change being re-fetched.

    async drain(input: {
      id: string;
      drain: NodeDrain;
      expectedVersion: number;
      setIneligibleOnStart?: boolean;
    }): Promise<NodeOutput> {
      const result = await new DrainNodeService(repository).execute({
        id: input.id,
        deadline: input.drain.deadline,
        ignoreSystemJobs: input.drain.ignoreSystemJobs,
        force: input.drain.force,
        setIneligibleOnStart: input.setIneligibleOnStart,
        expectedVersion: input.expectedVersion,
      });
      await invalidateAfterMutation(input.id);
      return result;
    },

    async drainCancel(input: {
      id: string;
      expectedVersion: number;
      keepIneligible?: boolean;
    }): Promise<NodeOutput> {
      const result = await new DrainCancelNodeService(repository).execute({
        id: input.id,
        keepIneligible: input.keepIneligible,
        expectedVersion: input.expectedVersion,
      });
      await invalidateAfterMutation(input.id);
      return result;
    },

    async setEligibility(input: {
      id: string;
      eligibility: NodeEligibility;
      expectedVersion: number;
    }): Promise<NodeOutput> {
      const result = await new SetNodeEligibilityService(repository).execute(
        input,
      );
      await invalidateAfterMutation(input.id);
      return result;
    },

    async setLifecycle(input: {
      id: string;
      lifecycle: NodeLifecycleState;
      expectedVersion: number;
    }): Promise<NodeOutput> {
      const result = await new SetNodeLifecycleService(repository).execute(
        input,
      );
      await invalidateAfterMutation(input.id);
      return result;
    },

    async metrics(id: string, range: MetricsRange): Promise<MetricsPoint[]> {
      return new GetNodeMetricsService(repository).execute({ id, range });
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      list: (projectId?: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.listByProject(projectId),
        }),
      detail: (id: string) =>
        queryClient.invalidateQueries({ queryKey: keys.detail(id) }),
      metrics: (id: string, range?: MetricsRange) =>
        queryClient.invalidateQueries({
          queryKey: range
            ? keys.metrics(id, range)
            : (['nodes', 'metrics', id] as const),
        }),
    },

    /**
     * Optimistic-update helpers. Presentation callers use these in
     * `onMutate` / `onError` to patch or roll back cached list/detail data
     * instead of triggering a full refetch.
     *
     * Pattern:
     *   onMutate → snapshot via `getListCache` / `getDetailCache`, apply
     *              patch via `updateListCache` / `updateDetailCache`,
     *              return the snapshots for rollback.
     *   onError  → `restoreListCache` / `restoreDetailCache` with the
     *              snapshots from onMutate context.
     */
    getListCache(projectId: string | undefined) {
      return queryClient.getQueryData<ListNodesOutput>(
        keys.listByProject(projectId),
      );
    },

    getDetailCache(id: string) {
      return queryClient.getQueryData<NodeOutput>(keys.detail(id));
    },

    updateListCache(
      projectId: string | undefined,
      updater: (prev: ListNodesOutput | undefined) => ListNodesOutput | undefined,
    ) {
      queryClient.setQueryData<ListNodesOutput>(
        keys.listByProject(projectId),
        (prev) => updater(prev),
      );
    },

    updateDetailCache(
      id: string,
      updater: (prev: NodeOutput | undefined) => NodeOutput | undefined,
    ) {
      queryClient.setQueryData<NodeOutput>(keys.detail(id), (prev) =>
        updater(prev),
      );
    },

    restoreListCache(
      projectId: string | undefined,
      snapshot: ListNodesOutput | undefined,
    ) {
      queryClient.setQueryData<ListNodesOutput | undefined>(
        keys.listByProject(projectId),
        snapshot,
      );
    },

    restoreDetailCache(id: string, snapshot: NodeOutput | undefined) {
      queryClient.setQueryData<NodeOutput | undefined>(
        keys.detail(id),
        snapshot,
      );
    },
  };
}

export type NodesResource = ReturnType<typeof createNodesResource>;
