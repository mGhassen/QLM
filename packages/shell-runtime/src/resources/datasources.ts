import type { QueryClient } from '@tanstack/react-query';

import type {
  Datasource,
  DatasourceMetadata,
} from '@qlm/domain/entities';
import type { IDatasourceRepository } from '@qlm/domain/repositories';
import {
  CreateDatasourceService,
  DeleteDatasourceService,
  GetDatasourceBySlugService,
  GetDatasourcesByProjectIdService,
  UpdateDatasourceService,
} from '@qlm/domain/services';
import type {
  CreateDatasourceInput,
  DatasourceOutput,
  UpdateDatasourceInput,
} from '@qlm/domain/usecases';

import type {
  GetDatasourceMetadataFn,
  TestConnectionFn,
  TestConnectionResult,
} from '../context';

export function createDatasourcesResource(
  repository: IDatasourceRepository,
  currentProjectId: string,
  currentUserId: string,
  queryClient: QueryClient,
  testConnectionFn: TestConnectionFn,
  getDatasourceMetadataFn: GetDatasourceMetadataFn,
) {
  const keys = {
    all: ['datasources'] as const,
    listByProject: (projectId: string = currentProjectId) =>
      ['datasources', 'project', projectId] as const,
    detail: (slug: string) => ['datasource', slug] as const,
    metadata: (datasourceId: string) =>
      ['datasource', 'metadata', datasourceId] as const,
  };

  return {
    keys,

    async list(
      params: { projectId?: string } = {},
    ): Promise<Datasource[]> {
      const pid = params.projectId ?? currentProjectId;
      return new GetDatasourcesByProjectIdService(repository).execute(pid);
    },

    async getBySlug(slug: string): Promise<Datasource> {
      return new GetDatasourceBySlugService(repository).execute(slug);
    },

    async getById(id: string): Promise<Datasource | null> {
      return repository.findById(id);
    },

    async create(
      input: Omit<CreateDatasourceInput, 'projectId' | 'createdBy'> & {
        projectId?: string;
        createdBy?: string;
      },
    ): Promise<DatasourceOutput> {
      return new CreateDatasourceService(repository).execute({
        projectId: input.projectId ?? currentProjectId,
        createdBy: input.createdBy ?? currentUserId,
        name: input.name,
        description: input.description,
        datasource_provider: input.datasource_provider,
        datasource_driver: input.datasource_driver,
        datasource_kind: input.datasource_kind,
        config: input.config,
      });
    },

    async update(input: UpdateDatasourceInput): Promise<DatasourceOutput> {
      return new UpdateDatasourceService(repository).execute({
        ...input,
        updatedBy: input.updatedBy ?? currentUserId,
      });
    },

    async delete(id: string): Promise<boolean> {
      return new DeleteDatasourceService(repository).execute(id);
    },

    /**
     * Test a datasource connection using a host-provided implementation.
     * The host decides how to run the test (client-side driver for
     * browser-runtime extensions, `POST /driver/command` for node-runtime
     * extensions). Matches the `runQuery` wiring pattern.
     */
    async testConnection(input: {
      provider: string;
      driverId: string;
      config: Record<string, unknown>;
    }): Promise<TestConnectionResult> {
      return testConnectionFn(input);
    },

    /**
     * Fetch a datasource's schema metadata (schemas, tables, columns,
     * relationships). Same host-dispatch contract as `testConnection`.
     */
    async metadata(input: {
      provider: string;
      driverId: string;
      config: Record<string, unknown>;
    }): Promise<DatasourceMetadata> {
      return getDatasourceMetadataFn(input);
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      list: (projectId?: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.listByProject(projectId),
        }),
      detail: (slug: string) =>
        queryClient.invalidateQueries({ queryKey: keys.detail(slug) }),
      metadata: (datasourceId: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.metadata(datasourceId),
        }),
    },
  };
}

export type DatasourcesResource = ReturnType<typeof createDatasourcesResource>;
