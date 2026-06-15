import type { QueryClient } from '@tanstack/react-query';

import type { IPerformanceProfileRepository } from '@qlm/domain/repositories';
import type { PerformanceProfile } from '@qlm/domain/entities';

export function createPerformanceProfilesResource(
  repository: IPerformanceProfileRepository,
  organizationId: string,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['performance-profiles'] as const,
    list: () => ['performance-profiles', 'list'] as const,
    listByAccount: (orgId: string) => ['performance-profiles', 'account', orgId] as const,
    detail: (id: string) => ['performance-profiles', 'detail', id] as const,
  };

  return {
    keys,

    async list(): Promise<PerformanceProfile[]> {
      return repository.findPublicCatalog();
    },

    async listByAccount(): Promise<PerformanceProfile[]> {
      return repository.findByAccountId(organizationId);
    },

    async get(id: string): Promise<PerformanceProfile | null> {
      return repository.findById(id);
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      list: () => queryClient.invalidateQueries({ queryKey: keys.list() }),
      listByAccount: () =>
        queryClient.invalidateQueries({ queryKey: keys.listByAccount(organizationId) }),
      detail: (id: string) =>
        queryClient.invalidateQueries({ queryKey: keys.detail(id) }),
    },
  };
}

export type PerformanceProfilesResource = ReturnType<
  typeof createPerformanceProfilesResource
>;
