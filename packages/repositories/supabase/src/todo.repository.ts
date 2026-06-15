import type { TodoItem } from '@qlm/domain/entities';
import { ITodoRepository } from '@qlm/domain/repositories';
import type { SupabaseClientType } from './types';

const TABLE = 'todos';

/** Row shape for todos (table added in schema 34; run typegen to get full types). */
type ConversationTodoRow = {
  conversation_id: string;
  items: unknown;
  updated_at: string;
};

/** Client cast for todos table (not in generated Database until typegen is run). */
type TodoTableClient = {
  from(table: string): {
    select(cols: string): {
      eq(
        col: string,
        val: string,
      ): {
        maybeSingle(): Promise<{
          data: ConversationTodoRow | null;
          error: { message: string } | null;
        }>;
      };
    };
    upsert(
      row: Record<string, unknown>,
      opts: { onConflict: string },
    ): Promise<{ error: { message: string } | null }>;
  };
};

function deserializeItems(items: unknown): TodoItem[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id ?? ''),
      content: String(row.content ?? ''),
      status: (row.status as TodoItem['status']) ?? 'pending',
      priority: (row.priority as TodoItem['priority']) ?? 'medium',
    } as TodoItem;
  });
}

function serializeItems(todos: TodoItem[]): unknown[] {
  return todos.map((t) => ({
    id: t.id,
    content: t.content,
    status: t.status,
    priority: t.priority,
  }));
}

export class TodoRepository extends ITodoRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  async findByConversationId(conversationId: string): Promise<TodoItem[]> {
    const client = this.client as unknown as TodoTableClient;
    const { data, error } = await client
      .from(TABLE)
      .select('items')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to fetch todos for conversation: ${error.message}`,
      );
    }

    if (!data?.items) {
      return [];
    }

    return deserializeItems(data.items);
  }

  async upsertByConversationId(
    conversationId: string,
    todos: TodoItem[],
  ): Promise<TodoItem[]> {
    const items = serializeItems(todos);
    const now = new Date().toISOString();

    const client = this.client as unknown as TodoTableClient;
    const { error } = await client.from(TABLE).upsert(
      {
        conversation_id: conversationId,
        items,
        updated_at: now,
      } as never,
      {
        onConflict: 'conversation_id',
      },
    );

    if (error) {
      throw new Error(
        `Failed to upsert todos for conversation: ${error.message}`,
      );
    }

    return todos;
  }
}
