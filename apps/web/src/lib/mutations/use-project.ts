import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Project } from '@qlm/domain/entities';
import type { IProjectRepository } from '@qlm/domain/repositories';
import {
  CreateProjectService,
  UpdateProjectService,
} from '@qlm/domain/services';
import type {
  CreateProjectInput,
  ProjectOutput,
  UpdateProjectInput,
} from '@qlm/domain/usecases';

import { getProjectsByOrganizationIdKey } from '@/lib/queries/use-get-projects';

type MutationOptions = {
  onSuccess?: (project: Project) => void;
  onError?: (error: Error) => void;
};

export function useCreateProject(
  repository: IProjectRepository,
  options?: MutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const service = new CreateProjectService(repository);
      return await service.execute(input);
    },
    onSuccess: (output: ProjectOutput) => {
      void queryClient.invalidateQueries({
        queryKey: getProjectsByOrganizationIdKey(output.organizationId),
      });
      options?.onSuccess?.(output as Project);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export function useUpdateProject(
  repository: IProjectRepository,
  options?: MutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      const service = new UpdateProjectService(repository);
      return await service.execute(input);
    },
    onSuccess: (output: ProjectOutput) => {
      void queryClient.invalidateQueries({
        queryKey: getProjectsByOrganizationIdKey(output.organizationId),
      });
      void queryClient.invalidateQueries({
        queryKey: ['project', output.slug],
      });
      void queryClient.invalidateQueries({
        queryKey: ['project', output.id],
      });
      options?.onSuccess?.(output as Project);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}
