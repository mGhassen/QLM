import type { RepositoryFindOptions } from '@guepard/domain/common';
import type { Datasource } from '@guepard/domain/entities';
import { IDatasourceRepository } from '@guepard/domain/repositories';
import type { Json } from '@guepard/supabase/database';
import type { SupabaseClientType } from './types';

export class DatasourceRepository extends IDatasourceRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private serialize(datasource: Datasource): Record<string, unknown> {
    return {
      id: datasource.id,
      project_id: datasource.projectId,
      slug: datasource.slug,
      name: datasource.name,
      description: datasource.description,
      datasource_provider: datasource.datasource_provider,
      datasource_driver: datasource.datasource_driver,
      datasource_kind: datasource.datasource_kind,
      datasource_config: datasource.config,
      created_at: datasource.createdAt.toISOString(),
      updated_at: datasource.updatedAt.toISOString(),
      created_by: datasource.createdBy,
      updated_by: datasource.updatedBy,
    };
  }

  private deserialize(row: Record<string, unknown>): Datasource {
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      description: row.description as string,
      projectId: row.project_id as string,
      datasource_provider: row.datasource_provider as string,
      datasource_driver: row.datasource_driver as string,
      datasource_kind: row.datasource_kind as string,
      config: (row.datasource_config as Record<string, unknown>) || {},
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string,
    } as Datasource;
  }

  async findAll(_options?: RepositoryFindOptions): Promise<Datasource[]> {
    const { data, error } = await this.client
      .from('datasources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch datasources: ${error.message}`);
    }

    const datasources = (data || []).map((row) => this.deserialize(row));

    const creatorIds = [
      ...new Set(datasources.map((d) => d.createdBy).filter(Boolean)),
    ];

    if (creatorIds.length === 0) {
      return datasources;
    }

    let accountsData: Array<{ user_id: string; name: string }> = [];

    try {
      const { data: rpcData, error: rpcError } = await (
        this.client.rpc as unknown as (
          name: string,
          args: { user_ids: string[] },
        ) => Promise<{
          data: Array<{ user_id: string; name: string }> | null;
          error: unknown;
        }>
      )('get_account_names_for_users', { user_ids: creatorIds });

      if (!rpcError && rpcData) {
        accountsData = rpcData;
      }
    } catch (rpcErr: unknown) {
      const errorMessage =
        rpcErr && typeof rpcErr === 'object' && 'message' in rpcErr
          ? String(rpcErr.message)
          : String(rpcErr);
      const errorCode =
        rpcErr && typeof rpcErr === 'object' && 'code' in rpcErr
          ? String(rpcErr.code)
          : '';

      if (
        !errorMessage.includes('404') &&
        !errorMessage.includes('PGRST202') &&
        !errorMessage.includes('PGRST116') &&
        !errorMessage.includes('42883') &&
        errorCode !== 'PGRST202'
      ) {
        throw rpcErr;
      }
    }

    if (accountsData.length === 0) {
      const { data: fallbackData, error: fallbackError } = await this.client
        .from('accounts')
        .select('user_id, name')
        .in('user_id', creatorIds);

      if (!fallbackError && fallbackData) {
        accountsData = fallbackData.map((acc) => ({
          user_id: (acc.user_id as string) || '',
          name: (acc.name as string) || '',
        }));
      }
    }

    const creatorMap = new Map<string, string>();
    for (const acc of accountsData) {
      const userId = acc.user_id;
      if (userId && acc.name) {
        creatorMap.set(userId, acc.name);
      }
    }

    return datasources.map((datasource) => ({
      ...datasource,
      creatorName: creatorMap.get(datasource.createdBy) || undefined,
    })) as Datasource[];
  }

  async findById(id: string): Promise<Datasource | null> {
    const { data, error } = await this.client
      .from('datasources')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch datasource: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async findBySlug(slug: string): Promise<Datasource | null> {
    const { data, error } = await this.client
      .from('datasources')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch datasource by slug: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async findByProjectId(projectId: string): Promise<Datasource[] | null> {
    const { data, error } = await this.client
      .from('datasources')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      throw new Error(
        `Failed to fetch datasources by project: ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      return null;
    }

    const datasources = data.map((row) => this.deserialize(row));

    const creatorIds = [
      ...new Set(datasources.map((d) => d.createdBy).filter(Boolean)),
    ];

    if (creatorIds.length === 0) {
      return datasources;
    }

    let accountsData: Array<{ user_id: string; name: string }> = [];

    try {
      const { data: rpcData, error: rpcError } = await (
        this.client.rpc as unknown as (
          name: string,
          args: { user_ids: string[] },
        ) => Promise<{
          data: Array<{ user_id: string; name: string }> | null;
          error: unknown;
        }>
      )('get_account_names_for_users', { user_ids: creatorIds });

      if (!rpcError && rpcData) {
        accountsData = rpcData;
      }
    } catch (rpcErr: unknown) {
      const errorMessage =
        rpcErr && typeof rpcErr === 'object' && 'message' in rpcErr
          ? String(rpcErr.message)
          : String(rpcErr);
      const errorCode =
        rpcErr && typeof rpcErr === 'object' && 'code' in rpcErr
          ? String(rpcErr.code)
          : '';

      if (
        !errorMessage.includes('404') &&
        !errorMessage.includes('PGRST202') &&
        !errorMessage.includes('PGRST116') &&
        !errorMessage.includes('42883') &&
        errorCode !== 'PGRST202'
      ) {
        throw rpcErr;
      }
    }

    if (accountsData.length === 0) {
      const { data: fallbackData, error: fallbackError } = await this.client
        .from('accounts')
        .select('user_id, name')
        .in('user_id', creatorIds);

      if (!fallbackError && fallbackData) {
        accountsData = fallbackData.map((acc) => ({
          user_id: (acc.user_id as string) || '',
          name: (acc.name as string) || '',
        }));
      }
    }

    const creatorMap = new Map<string, string>();
    for (const acc of accountsData) {
      const userId = acc.user_id;
      if (userId && acc.name) {
        creatorMap.set(userId, acc.name);
      }
    }

    return datasources.map((datasource) => ({
      ...datasource,
      creatorName: creatorMap.get(datasource.createdBy) || undefined,
    })) as Datasource[];
  }

  async create(entity: Datasource): Promise<Datasource> {
    const now = new Date();
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to create a datasource');
    }
    // Use authenticated user if createdBy is not provided or is empty
    const userId =
      entity.createdBy && entity.createdBy.trim() !== ''
        ? entity.createdBy
        : user.id;

    const entityWithId = {
      ...entity,
      id: entity.id || globalThis.crypto.randomUUID(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      createdBy: userId,
      updatedBy:
        entity.updatedBy && entity.updatedBy.trim() !== ''
          ? entity.updatedBy
          : userId,
    };

    const entityWithSlug = {
      ...entityWithId,
      slug: this.shortenId(entityWithId.id),
    };

    const serialized = this.serialize(entityWithSlug);
    const { data, error } = await this.client
      .from('datasources')
      .insert(serialized as never)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create datasource: ${error.message}`);
    }

    return this.deserialize(data);
  }

  async update(entity: Datasource): Promise<Datasource> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to update a datasource');
    }
    // Use authenticated user if updatedBy is not provided or is empty
    const userId =
      entity.updatedBy && entity.updatedBy.trim() !== ''
        ? entity.updatedBy
        : user.id;
    const entityWithSlug = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
      updatedBy: entity.updatedBy || userId,
      slug: this.shortenId(entity.id),
    };

    const serialized = this.serialize(entityWithSlug);
    const { data, error } = await this.client
      .from('datasources')
      .update({
        slug: serialized.slug as string,
        name: serialized.name as string,
        description: serialized.description as string | undefined,
        datasource_provider: serialized.datasource_provider as string,
        datasource_driver: serialized.datasource_driver as string,
        datasource_kind: serialized.datasource_kind as string,
        datasource_config: serialized.datasource_config as Json,
        updated_at: serialized.updated_at as string,
        updated_by: serialized.updated_by as string,
      })
      .eq('id', entity.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update datasource: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Datasource with id ${entity.id} not found`);
    }

    return this.deserialize(data);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.client
      .from('datasources')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete datasource: ${error.message}`);
    }

    return true;
  }

  async revealSecrets(
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // Config is stored as-is in datasource_config; no server-side decryption.
    // If encryption at rest is added later, decrypt here (e.g. via Supabase Vault).
    return config;
  }
}
