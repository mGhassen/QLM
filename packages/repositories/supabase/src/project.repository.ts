import type { RepositoryFindOptions } from '@qlm/domain/common';
import type { Project } from '@qlm/domain/entities';
import { IProjectRepository } from '@qlm/domain/repositories';
import type { SupabaseClientType } from './types';

export class ProjectRepository extends IProjectRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private serialize(project: Project): Record<string, unknown> {
    return {
      id: project.id,
      organization_id: project.organizationId,
      slug: project.slug,
      name: project.name,
      description: project.description || null,
      status: project.status || 'active',
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
      created_by: project.createdBy,
      updated_by: project.updatedBy,
    };
  }

  private deserialize(row: Record<string, unknown>): Project {
    return {
      id: row.id as string,
      organizationId: (row.organization_id || row.organization_id) as string, // Support both for backward compatibility
      slug: row.slug as string,
      name: row.name as string,
      description: row.description as string,
      status: row.status as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string,
    } as Project;
  }

  async search(
    query: string,
    options?: RepositoryFindOptions & { organizationId?: string },
  ): Promise<Project[]> {
    const q = query.trim();
    let builder = this.client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.organizationId) {
      builder = builder.eq('organization_id', options.organizationId);
    }

    if (q) {
      const pattern = `%${q}%`;
      builder = builder.or(
        `name.ilike.${pattern},slug.ilike.${pattern},description.ilike.${pattern}`,
      );
    }

    if (options?.offset !== undefined || options?.limit !== undefined) {
      const from = options?.offset ?? 0;
      const to = options?.limit != null ? from + options.limit - 1 : from + 999;
      builder = builder.range(from, to);
    }

    const { data, error } = await builder;

    if (error) {
      throw new Error(`Failed to search projects: ${error.message}`);
    }

    return (data || []).map((row) => this.deserialize(row));
  }

  async findAll(_options?: RepositoryFindOptions): Promise<Project[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    return (data || []).map((row) => this.deserialize(row));
  }

  async findAllByOrganizationId(organizationId: string): Promise<Project[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    const projects = (data || []).map((row) => this.deserialize(row));

    const creatorIds = [
      ...new Set(projects.map((p) => p.createdBy).filter(Boolean)),
    ];

    if (creatorIds.length === 0) {
      return projects;
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

    return projects.map((project) => ({
      ...project,
      creatorName: creatorMap.get(project.createdBy) || undefined,
    })) as Project[];
  }

  async findById(id: string): Promise<Project | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async findBySlug(slug: string): Promise<Project | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch project by slug: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async create(entity: Project): Promise<Project> {
    const now = new Date();
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to create a project');
    }
    const userId = entity.createdBy || user.id;

    const entityWithId = {
      ...entity,
      id: entity.id || globalThis.crypto.randomUUID(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      createdBy: entity.createdBy || userId,
      updatedBy: entity.updatedBy || userId,
      status: entity.status || 'active',
    };

    const entityWithSlug = {
      ...entityWithId,
      slug: this.shortenId(entityWithId.id),
    };

    const serialized = this.serialize(entityWithSlug);
    const { data, error } = await this.client
      .from('projects')
      .insert(serialized as never)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    return this.deserialize(data);
  }

  async update(entity: Project): Promise<Project> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to update a project');
    }
    const userId = entity.updatedBy || user.id;
    const entityWithSlug = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
      updatedBy: entity.updatedBy || userId,
      slug: this.shortenId(entity.id),
    };

    const serialized = this.serialize(entityWithSlug);
    const { data, error } = await this.client
      .from('projects')
      .update({
        slug: serialized.slug as string,
        name: serialized.name as string,
        description: serialized.description as string | undefined,
        status: serialized.status as string | undefined,
        updated_at: serialized.updated_at as string,
        updated_by: serialized.updated_by as string,
      } as never)
      .eq('id', entity.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update project: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Project with id ${entity.id} not found`);
    }

    return this.deserialize(data);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.client.from('projects').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }

    return true;
  }
}
