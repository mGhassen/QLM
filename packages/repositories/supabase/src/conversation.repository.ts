import { v4 as uuidv4 } from 'uuid';
import type { RepositoryFindOptions } from '@qlm/domain/common';
import type { Conversation } from '@qlm/domain/entities';
import { IConversationRepository } from '@qlm/domain/repositories';
import type { Json } from '@qlm/supabase/database';
import type { SupabaseClientType } from './types';

export class ConversationRepository extends IConversationRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private serialize(conversation: Conversation): Record<string, unknown> {
    return {
      id: conversation.id,
      project_id: conversation.projectId,
      slug: conversation.slug,
      title: conversation.title,
      task_id: conversation.taskId,
      datasources: conversation.datasources,
      created_at: conversation.createdAt.toISOString(),
      updated_at: conversation.updatedAt.toISOString(),
      created_by: conversation.createdBy,
      updated_by: conversation.updatedBy,
    };
  }

  private deserialize(row: Record<string, unknown>): Conversation {
    return {
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      projectId: row.project_id as string,
      taskId: row.task_id as string,
      datasources: (row.datasources as string[]) || [],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string,
    } as Conversation;
  }

  async findAll(options?: RepositoryFindOptions): Promise<Conversation[]> {
    let query = this.client.from('conversations').select('*');

    if (options?.order) {
      // Parse order string like "created_at DESC" or "created_at ASC"
      const [column, direction] = options.order.split(' ');
      if (column) {
        query = query.order(column, {
          ascending: direction?.toUpperCase() !== 'DESC',
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 1000) - 1,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }

    return (data || []).map((row) => this.deserialize(row));
  }

  async findById(id: string): Promise<Conversation | null> {
    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch conversation: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async findBySlug(slug: string): Promise<Conversation | null> {
    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch conversation by slug: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async findByProjectId(projectId: string): Promise<Conversation[]> {
    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch conversations by project: ${error.message}`,
      );
    }

    return (data || []).map((row) => this.deserialize(row));
  }

  async findByTaskId(taskId: string): Promise<Conversation[]> {
    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch conversations by task: ${error.message}`,
      );
    }

    return (data || []).map((row) => this.deserialize(row));
  }

  async create(entity: Conversation): Promise<Conversation> {
    const now = new Date();
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to create a conversation');
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
      datasources: entity.datasources || [],
      createdBy: userId,
    };

    const entityWithSlug = {
      ...entityWithId,
      slug: this.shortenId(entityWithId.id),
    };

    const serialized = this.serialize(entityWithSlug);
    serialized.updated_by = userId;

    const { data, error } = await this.client
      .from('conversations')
      .insert(serialized as never)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return this.deserialize(data);
  }

  async update(entity: Conversation): Promise<Conversation> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to update a conversation');
    }
    const userId =
      entity.updatedBy && entity.updatedBy.trim() !== ''
        ? entity.updatedBy
        : user.id;

    const entityWithSlug = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
      slug: this.shortenId(entity.id),
      updatedBy: userId,
    };

    const serialized = this.serialize(entityWithSlug);
    const { data, error } = await this.client
      .from('conversations')
      .update({
        slug: serialized.slug as string,
        title: serialized.title as string,
        datasources: serialized.datasources as Json,
        updated_by: serialized.updated_by as string,
      } as never)
      .eq('id', entity.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update conversation: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Conversation with id ${entity.id} not found`);
    }

    return this.deserialize(data);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.client
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }

    return true;
  }
}
