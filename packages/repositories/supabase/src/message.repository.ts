import { v4 as uuidv4 } from 'uuid';
import type {
  RepositoryFindOptions,
  PaginationOptions,
  PaginatedResult,
} from '@qlm/domain/common';
import type { Message } from '@qlm/domain/entities';
import { IMessageRepository } from '@qlm/domain/repositories';
import type { Json } from '@qlm/supabase/database';
import type { SupabaseClientType } from './types';

export class MessageRepository extends IMessageRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private serialize(message: Message): Record<string, unknown> {
    return {
      id: message.id,
      conversation_id: message.conversationId,
      content: message.content || {},
      role: message.role,
      metadata: message.metadata || {},
      created_at: message.createdAt.toISOString(),
      updated_at: message.updatedAt.toISOString(),
      created_by: message.createdBy,
      updated_by: message.updatedBy,
    };
  }

  private deserialize(row: Record<string, unknown>): Message {
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      content: (row.content as Record<string, unknown>) || {},
      role: row.role as string,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string,
    } as Message;
  }

  async findAll(options?: RepositoryFindOptions): Promise<Message[]> {
    let query = this.client.from('messages').select('*');

    if (options?.order) {
      const [column, direction] = options.order.split(' ');
      if (column) {
        query = query.order(column, {
          ascending: direction?.toUpperCase() !== 'DESC',
        });
      } else {
        query = query.order('created_at', { ascending: true });
      }
    } else {
      query = query.order('created_at', { ascending: true });
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
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return (data || []).map((row) => this.deserialize(row));
  }

  async findById(id: string): Promise<Message | null> {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch message: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async findBySlug(_slug: string): Promise<Message | null> {
    // Messages don't have slugs, but we need to implement this for the interface
    return null;
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch messages by conversation: ${error.message}`,
      );
    }

    return (data || []).map((row) => this.deserialize(row));
  }

  async findByConversationIdPaginated(
    conversationId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Message>> {
    let query = this.client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId);

    if (options.cursor) {
      query = query.lt('created_at', options.cursor);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(options.limit + 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `Failed to fetch paginated messages by conversation: ${error.message}`,
      );
    }

    const allMessages = (data || []).map((row) => this.deserialize(row));
    const hasMore = allMessages.length > options.limit;
    const messages = allMessages.slice(0, options.limit).reverse();

    const nextCursor =
      messages.length > 0 && messages[0]
        ? messages[0].createdAt.toISOString()
        : null;

    return { messages, nextCursor, hasMore };
  }

  async create(entity: Message): Promise<Message> {
    const now = new Date();
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to create a message');
    }
    // Use authenticated user if createdBy is not provided or is empty
    const userId =
      entity.createdBy && entity.createdBy.trim() !== ''
        ? entity.createdBy
        : user.id;

    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      createdBy: userId,
      updatedBy:
        entity.updatedBy && entity.updatedBy.trim() !== ''
          ? entity.updatedBy
          : userId,
      metadata: entity.metadata || {},
    };

    const serialized = this.serialize(entityWithId);
    const { data, error } = await this.client
      .from('messages')
      .insert(serialized as never)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }

    return this.deserialize(data);
  }

  async update(entity: Message): Promise<Message> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to update a message');
    }
    // Use authenticated user if updatedBy is not provided or is empty
    const userId =
      entity.updatedBy && entity.updatedBy.trim() !== ''
        ? entity.updatedBy
        : user.id;

    const updatedEntity = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
      updatedBy: userId,
    };

    const serialized = this.serialize(updatedEntity);
    const { data, error } = await this.client
      .from('messages')
      .update({
        content: serialized.content as Json,
        metadata: serialized.metadata as Json,
        updated_at: serialized.updated_at as string,
        updated_by: serialized.updated_by as string,
      } as never)
      .eq('id', entity.id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update message: ${error.message}`);
    }

    if (!data) {
      throw new Error(
        `Message with id ${entity.id} not found or update denied by permissions`,
      );
    }

    return this.deserialize(data);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.client.from('messages').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }

    return true;
  }
}
