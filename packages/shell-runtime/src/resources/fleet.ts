import type { QueryClient } from '@tanstack/react-query';

import type {
  INodeRepository,
  IPoolRepository,
} from '@qlm/domain/repositories';
import { FleetAggregateService } from '@qlm/domain/services';
import type {
  FleetSummary,
  PressurePoint,
} from '@qlm/domain/usecases';
import type { Pool } from '@qlm/domain/entities';

/**
 * Runtime namespace for "where is the fleet?" reads. Both topology and
 * infrastructure UIs consume `shell.fleet.*` so they always see the
 * same numbers.
 *
 * The `projectId` injected here carries the organization id by domain
 * convention (see `node.repository.ts` — "projectId holds org ID").
 */
export function createFleetResource(
  nodeRepository: INodeRepository,
  poolRepository: IPoolRepository,
  currentProjectId: string,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['fleet'] as const,
    summary: (projectId: string = currentProjectId) =>
      ['fleet', 'summary', projectId] as const,
    pools: (projectId: string = currentProjectId) =>
      ['fleet', 'pools', projectId] as const,
    pressure: (projectId: string = currentProjectId) =>
      ['fleet', 'pressure', projectId] as const,
  };

  function service() {
    return new FleetAggregateService(nodeRepository, poolRepository);
  }

  return {
    keys,

    async summary(
      params: { projectId?: string } = {},
    ): Promise<FleetSummary> {
      return service().summary(params.projectId ?? currentProjectId);
    },

    async pools(params: { projectId?: string } = {}): Promise<Pool[]> {
      return service().listPools(params.projectId ?? currentProjectId);
    },

    async pressurePoints(
      params: { projectId?: string } = {},
    ): Promise<PressurePoint[]> {
      return service().pressurePoints(
        params.projectId ?? currentProjectId,
      );
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      summary: (projectId?: string) =>
        queryClient.invalidateQueries({ queryKey: keys.summary(projectId) }),
      pools: (projectId?: string) =>
        queryClient.invalidateQueries({ queryKey: keys.pools(projectId) }),
      pressure: (projectId?: string) =>
        queryClient.invalidateQueries({ queryKey: keys.pressure(projectId) }),
    },
  };
}

export type FleetResource = ReturnType<typeof createFleetResource>;
