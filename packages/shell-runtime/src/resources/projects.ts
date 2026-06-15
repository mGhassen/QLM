import type { QueryClient } from '@tanstack/react-query';

import type { IProjectRepository } from '@qlm/domain/repositories';
import {
  CreateProjectService,
  DeleteProjectService,
  GetProjectBySlugService,
  GetProjectService,
  GetProjectsByOrganizationIdService,
  UpdateProjectService,
} from '@qlm/domain/services';
import type {
  CreateProjectInput,
  ProjectOutput,
  UpdateProjectInput,
} from '@qlm/domain/usecases';

export function createProjectsResource(
  repository: IProjectRepository,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['projects'] as const,
    listByOrganization: (orgId: string) =>
      ['projects', 'organization', orgId] as const,
    detail: (id: string) => ['project', id] as const,
    bySlug: (slug: string) => ['project', 'by-slug', slug] as const,
  };

  return {
    keys,

    async list(params: { organizationId: string }): Promise<ProjectOutput[]> {
      return new GetProjectsByOrganizationIdService(repository).execute(
        params.organizationId,
      );
    },

    async get(id: string): Promise<ProjectOutput> {
      return new GetProjectService(repository).execute(id);
    },

    async getBySlug(slug: string): Promise<ProjectOutput> {
      return new GetProjectBySlugService(repository).execute(slug);
    },

    async create(input: CreateProjectInput): Promise<ProjectOutput> {
      return new CreateProjectService(repository).execute(input);
    },

    async update(input: UpdateProjectInput): Promise<ProjectOutput> {
      return new UpdateProjectService(repository).execute(input);
    },

    async delete(id: string): Promise<boolean> {
      return new DeleteProjectService(repository).execute(id);
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      list: (orgId: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.listByOrganization(orgId),
        }),
      detail: (id: string) =>
        queryClient.invalidateQueries({ queryKey: keys.detail(id) }),
    },
  };
}

export type ProjectsResource = ReturnType<typeof createProjectsResource>;
