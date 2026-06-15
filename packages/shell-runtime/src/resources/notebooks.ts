import type { QueryClient } from '@tanstack/react-query';

import type { INotebookRepository } from '@qlm/domain/repositories';
import {
  CreateNotebookService,
  DeleteNotebookService,
  GetNotebookBySlugService,
  GetNotebookService,
  GetNotebooksByProjectIdService,
  UpdateNotebookService,
} from '@qlm/domain/services';
import type {
  CreateNotebookInput,
  NotebookOutput,
  UpdateNotebookInput,
} from '@qlm/domain/usecases';

export function createNotebooksResource(
  repository: INotebookRepository,
  currentProjectId: string,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['notebooks'] as const,
    listByProject: (projectId: string = currentProjectId) =>
      ['notebooks', 'project', projectId] as const,
    detail: (id: string) => ['notebook', id] as const,
    bySlug: (slug: string) => ['notebook', 'by-slug', slug] as const,
  };

  return {
    keys,

    async list(
      params: { projectId?: string } = {},
    ): Promise<NotebookOutput[]> {
      const pid = params.projectId ?? currentProjectId;
      return new GetNotebooksByProjectIdService(repository).execute(pid);
    },

    async get(id: string): Promise<NotebookOutput> {
      return new GetNotebookService(repository).execute(id);
    },

    async getBySlug(slug: string): Promise<NotebookOutput> {
      return new GetNotebookBySlugService(repository).execute(slug);
    },

    async create(
      input: Omit<CreateNotebookInput, 'projectId'> & {
        projectId?: string;
      },
    ): Promise<NotebookOutput> {
      return new CreateNotebookService(repository).execute({
        projectId: input.projectId ?? currentProjectId,
        title: input.title,
        description: input.description,
      });
    },

    async update(input: UpdateNotebookInput): Promise<NotebookOutput> {
      return new UpdateNotebookService(repository).execute(input);
    },

    async delete(id: string): Promise<boolean> {
      return new DeleteNotebookService(repository).execute(id);
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      list: (projectId?: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.listByProject(projectId),
        }),
      detail: (id: string) =>
        queryClient.invalidateQueries({ queryKey: keys.detail(id) }),
    },
  };
}

export type NotebooksResource = ReturnType<typeof createNotebooksResource>;
