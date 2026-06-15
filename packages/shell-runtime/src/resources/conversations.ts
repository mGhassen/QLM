import type { QueryClient } from '@tanstack/react-query';

import type { IConversationRepository } from '@qlm/domain/repositories';
import {
  CreateConversationService,
  DeleteConversationService,
  GetConversationBySlugService,
  GetConversationsByProjectIdService,
  GetOrCreateDefaultConversationService,
  UpdateConversationService,
} from '@qlm/domain/services';
import type {
  ConversationOutput,
  UpdateConversationInput,
} from '@qlm/domain/usecases';

export type CreateConversationResourceInput = {
  projectId?: string;
  title: string;
  seedMessage?: string;
  taskId?: string;
  datasources?: string[];
};

export type UpdateConversationResourceInput = Omit<
  UpdateConversationInput,
  'updatedBy'
>;

export function createConversationsResource(
  repository: IConversationRepository,
  currentProjectId: string,
  currentUserId: string,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['conversations'] as const,
    listByProject: (projectId: string = currentProjectId) =>
      ['conversations', 'project', projectId] as const,
    detail: (id: string) => ['conversation', id] as const,
    bySlug: (slug: string) => ['conversation', 'by-slug', slug] as const,
  };

  return {
    keys,

    async list(
      params: { projectId?: string } = {},
    ): Promise<ConversationOutput[]> {
      const pid = params.projectId ?? currentProjectId;
      return new GetConversationsByProjectIdService(repository).execute(pid);
    },

    async getBySlug(slug: string): Promise<ConversationOutput> {
      return new GetConversationBySlugService(repository).execute(slug);
    },

    async getDefaultForProject(
      params: { projectId?: string } = {},
    ): Promise<ConversationOutput> {
      const pid = params.projectId ?? currentProjectId;
      return new GetOrCreateDefaultConversationService(repository).execute({
        projectId: pid,
        userId: currentUserId,
      });
    },

    async create(
      input: CreateConversationResourceInput,
    ): Promise<ConversationOutput> {
      return new CreateConversationService(repository).execute({
        projectId: input.projectId ?? currentProjectId,
        title: input.title,
        seedMessage: input.seedMessage ?? '',
        taskId: input.taskId ?? crypto.randomUUID(),
        datasources: input.datasources ?? [],
        createdBy: currentUserId,
      });
    },

    async update(
      input: UpdateConversationResourceInput,
    ): Promise<ConversationOutput> {
      return new UpdateConversationService(repository).execute({
        ...input,
        updatedBy: currentUserId,
      });
    },

    async delete(id: string): Promise<boolean> {
      return new DeleteConversationService(repository).execute(id);
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      list: (projectId?: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.listByProject(projectId),
        }),
      bySlug: (slug: string) =>
        queryClient.invalidateQueries({ queryKey: keys.bySlug(slug) }),
      detail: (id: string) =>
        queryClient.invalidateQueries({ queryKey: keys.detail(id) }),
    },
  };
}

export type ConversationsResource = ReturnType<
  typeof createConversationsResource
>;
