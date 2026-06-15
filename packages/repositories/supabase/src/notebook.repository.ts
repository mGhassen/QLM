import { v4 as uuidv4 } from 'uuid';
import type { Notebook } from '@guepard/domain/entities';
import { INotebookRepository } from '@guepard/domain/repositories';
import type { Json } from '@guepard/supabase/database';
import type { SupabaseClientType } from './types';

export class NotebookRepository extends INotebookRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private serialize(notebook: Notebook): Record<string, unknown> {
    return {
      id: notebook.id,
      project_id: notebook.projectId,
      slug: notebook.slug,
      title: notebook.title,
      description: notebook.description || null,
      datasources: notebook.datasources,
      cells: notebook.cells,
      version: notebook.version,
      created_at: notebook.createdAt.toISOString(),
      updated_at: notebook.updatedAt.toISOString(),
      created_by: notebook.createdBy,
      is_public: notebook.isPublic ?? false,
      remixed_from: notebook.remixedFrom || null,
    };
  }

  private deserialize(row: Record<string, unknown>): Notebook {
    const rawDescription = row.description;
    const normalizedDescription =
      typeof rawDescription === 'string' && rawDescription.trim().length > 0
        ? (rawDescription as string)
        : undefined;

    return {
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      description: normalizedDescription,
      projectId: row.project_id as string,
      datasources: (row.datasources as string[]) || [],
      cells: (row.cells as unknown[]) || [],
      version: (row.version as number) || 1,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy: row.created_by as string | undefined,
      isPublic: (row.is_public as boolean) ?? false,
      remixedFrom: (row.remixed_from as string | null) || undefined,
    } as Notebook;
  }

  async findAll(): Promise<Notebook[]> {
    const { data, error } = await this.client
      .from('notebooks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch notebooks: ${error.message}`);
    }

    return (data || []).map((row) => this.deserialize(row));
  }

  async findById(id: string): Promise<Notebook | null> {
    const { data, error } = await this.client
      .from('notebooks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch notebook: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async findBySlug(slug: string): Promise<Notebook | null> {
    const { data, error } = await this.client
      .from('notebooks')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch notebook by slug: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async findByProjectId(projectId: string): Promise<Notebook[] | null> {
    const { data, error } = await this.client
      .from('notebooks')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      throw new Error(`Failed to fetch notebooks by project: ${error.message}`);
    }

    return data && data.length > 0
      ? data.map((row) => this.deserialize(row))
      : null;
  }

  async create(entity: Notebook): Promise<Notebook> {
    const now = new Date();
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to create a notebook');
    }
    const userId =
      entity.createdBy && entity.createdBy.trim() !== ''
        ? entity.createdBy
        : user.id;

    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      version: entity.version || 1,
      createdBy: userId,
    };

    const entityWithSlug = {
      ...entityWithId,
      slug: this.shortenId(entityWithId.id),
    };

    const serialized = this.serialize(entityWithSlug);
    serialized.updated_by = userId;

    const { data, error } = await this.client
      .from('notebooks')
      .insert(serialized as never)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create notebook: ${error.message}`);
    }

    return this.deserialize(data);
  }

  async update(entity: Notebook): Promise<Notebook> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to update a notebook');
    }

    // First, fetch the current version to save it
    const currentNotebook = await this.findById(entity.id);
    if (!currentNotebook) {
      throw new Error(`Notebook with id ${entity.id} not found`);
    }

    // Save current version to versions store
    const versionId = uuidv4();
    const { error: versionError } = await this.client
      .from('notebook_versions')
      .insert({
        version_id: versionId,
        notebook_id: currentNotebook.id,
        version: currentNotebook.version,
        data: this.serialize(currentNotebook) as unknown as Json,
        saved_at: new Date().toISOString(),
      } as never);

    if (versionError) {
      throw new Error(
        `Failed to save notebook version: ${versionError.message}`,
      );
    }

    // Increment version and update timestamp
    const updatedEntity: Notebook = {
      ...entity,
      createdAt: currentNotebook.createdAt,
      version: currentNotebook.version + 1,
      updatedAt: new Date(),
      slug: this.shortenId(entity.id),
    };

    const serialized = this.serialize(updatedEntity);
    const { data, error } = await this.client
      .from('notebooks')
      .update({
        slug: serialized.slug as string,
        title: serialized.title as string,
        description: serialized.description as string | undefined,
        datasources: serialized.datasources as Json,
        cells: serialized.cells as Json,
        version: serialized.version as number,
        updated_at: serialized.updated_at as string,
        updated_by: user.id,
      } as never)
      .eq('id', entity.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update notebook: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Notebook with id ${entity.id} not found`);
    }

    return this.deserialize(data);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.client.from('notebooks').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete notebook: ${error.message}`);
    }

    return true;
  }
}
