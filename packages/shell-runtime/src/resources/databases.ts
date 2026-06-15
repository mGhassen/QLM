import type { QueryClient } from '@tanstack/react-query';

import type { IDatabaseRepository } from '@guepard/domain/repositories';
import {
  CreateDatabaseService,
  DeleteDatabaseService,
  GetDatabaseService,
  ListDatabasesService,
  UpdateDatabaseService,
} from '@guepard/domain/services';
import type {
  CreateDatabaseInput,
  DatabaseOutput,
  UpdateDatabaseInput,
} from '@guepard/domain/usecases';

export function createDatabasesResource(
  repository: IDatabaseRepository,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['databases'] as const,
    list: () => ['databases', 'list'] as const,
    detail: (id: string) => ['databases', 'detail', id] as const,
  };

  return {
    keys,

    async list(): Promise<DatabaseOutput[]> {
      return new ListDatabasesService(repository).execute({});
    },

    async get(id: string): Promise<DatabaseOutput> {
      return new GetDatabaseService(repository).execute(id);
    },

    async create(input: CreateDatabaseInput): Promise<DatabaseOutput> {
      return new CreateDatabaseService(repository).execute(input);
    },

    async update(input: UpdateDatabaseInput): Promise<DatabaseOutput> {
      return new UpdateDatabaseService(repository).execute(input);
    },

    async delete(id: string): Promise<void> {
      return new DeleteDatabaseService(repository).execute(id);
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      list: () => queryClient.invalidateQueries({ queryKey: keys.list() }),
      detail: (id: string) =>
        queryClient.invalidateQueries({ queryKey: keys.detail(id) }),
    },
  };
}

export type DatabasesResource = ReturnType<typeof createDatabasesResource>;
