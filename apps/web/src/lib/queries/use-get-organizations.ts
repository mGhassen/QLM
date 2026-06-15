import { useQuery } from '@tanstack/react-query';

import type { IOrganizationRepository } from '@qlm/domain/repositories';
import {
  GetOrganizationBySlugService,
  GetOrganizationService,
  GetOrganizationsService,
} from '@qlm/domain/services';

export function getOrganizationsKey() {
  return ['organizations'] as const;
}

export function getOrganizationBySlugKey(slug: string) {
  return ['organization', slug] as const;
}

export function getOrganizationByIdKey(id: string) {
  return ['organization', id] as const;
}

export function useGetOrganizations(repository: IOrganizationRepository) {
  return useQuery({
    queryKey: getOrganizationsKey(),
    queryFn: async () => {
      const service = new GetOrganizationsService(repository);
      return service.execute();
    },
    staleTime: 30 * 1000,
  });
}

export function useGetOrganizationBySlug(
  repository: IOrganizationRepository,
  slug: string,
) {
  return useQuery({
    queryKey: getOrganizationBySlugKey(slug),
    queryFn: async () => {
      const service = new GetOrganizationBySlugService(repository);
      return service.execute(slug);
    },
    staleTime: 30 * 1000,
    enabled: !!slug,
  });
}

export function useGetOrganizationById(
  repository: IOrganizationRepository,
  id: string,
) {
  return useQuery({
    queryKey: getOrganizationByIdKey(id),
    queryFn: async () => {
      const service = new GetOrganizationService(repository);
      return service.execute(id);
    },
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}
