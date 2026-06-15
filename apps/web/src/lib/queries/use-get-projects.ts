import { useQuery } from '@tanstack/react-query';

import type { IProjectRepository } from '@qlm/domain/repositories';
import { GetProjectsByOrganizationIdService } from '@qlm/domain/services';

export function getProjectsByOrganizationIdKey(organizationId: string) {
  return ['projects', organizationId] as const;
}

export function useGetProjectsByOrganizationId(
  repository: IProjectRepository,
  organizationId: string | undefined,
) {
  return useQuery({
    queryKey: getProjectsByOrganizationIdKey(organizationId ?? ''),
    queryFn: async () => {
      if (!organizationId) return [];
      const service = new GetProjectsByOrganizationIdService(repository);
      return service.execute(organizationId);
    },
    staleTime: 30 * 1000,
    enabled: !!organizationId,
  });
}
