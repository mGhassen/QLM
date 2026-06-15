import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Organization } from '@qlm/domain/entities';
import type { IOrganizationRepository } from '@qlm/domain/repositories';
import {
  CreateOrganizationService,
  UpdateOrganizationService,
} from '@qlm/domain/services';
import type {
  CreateOrganizationInput,
  OrganizationOutput,
  UpdateOrganizationInput,
} from '@qlm/domain/usecases';

import {
  getOrganizationBySlugKey,
  getOrganizationsKey,
} from '@/lib/queries/use-get-organizations';

type MutationOptions = {
  onSuccess?: (organization: Organization) => void;
  onError?: (error: Error) => void;
};

export function useCreateOrganization(
  repository: IOrganizationRepository,
  options?: MutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrganizationInput) => {
      const service = new CreateOrganizationService(repository);
      return await service.execute(input);
    },
    onSuccess: (output: OrganizationOutput) => {
      void queryClient.invalidateQueries({ queryKey: getOrganizationsKey() });
      options?.onSuccess?.(output as Organization);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export function useUpdateOrganization(
  repository: IOrganizationRepository,
  options?: MutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateOrganizationInput) => {
      const service = new UpdateOrganizationService(repository);
      return await service.execute(input);
    },
    onSuccess: (output: OrganizationOutput) => {
      void queryClient.invalidateQueries({ queryKey: getOrganizationsKey() });
      void queryClient.invalidateQueries({
        queryKey: getOrganizationBySlugKey(output.slug),
      });
      options?.onSuccess?.(output as Organization);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}
