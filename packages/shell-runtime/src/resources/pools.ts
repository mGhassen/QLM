import type { QueryClient } from '@tanstack/react-query';

import type { IPoolRepository } from '@guepard/domain/repositories';
import { ListPoolsByProjectService } from '@guepard/domain/services';
import type { ListPoolsOutput } from '@guepard/domain/usecases';

export function createPoolsResource(
  repository: IPoolRepository,
  currentProjectId: string,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['pools'] as const,
    listByProject: (projectId: string = currentProjectId) =>
      ['pools', 'project', projectId] as const,
  };

  return {
    keys,

    async list(
      params: { projectId?: string } = {},
    ): Promise<ListPoolsOutput> {
      const projectId = params.projectId ?? currentProjectId;
      return new ListPoolsByProjectService(repository).execute({ projectId });
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      list: (projectId?: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.listByProject(projectId),
        }),
    },
  };
}

export type PoolsResource = ReturnType<typeof createPoolsResource>;
