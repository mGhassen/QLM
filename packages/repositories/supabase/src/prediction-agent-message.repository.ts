import type { PredictionAgentMessage } from '@guepard/domain/entities';
import { IPredictionAgentMessageRepository } from '@guepard/domain/repositories';

import type { SupabaseClientType } from './types';

const TABLE = 'prediction_agent_messages' as const;

type Row = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
};

function deserialize(row: Row): PredictionAgentMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: new Date(row.created_at),
  };
}

export class PredictionAgentMessageRepository extends IPredictionAgentMessageRepository {
  constructor(private readonly client: SupabaseClientType) {
    super();
  }

  public async create(
    message: PredictionAgentMessage,
  ): Promise<PredictionAgentMessage> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert({
        id: message.id,
        conversation_id: message.conversationId,
        role: message.role,
        content: message.content,
        created_at: message.createdAt.toISOString(),
      })
      .select('*')
      .single();
    if (error) {
      throw new Error(
        `Failed to create prediction agent message: ${error.message}`,
      );
    }
    return deserialize(data as Row);
  }

  public async listByConversation(
    conversationId: string,
  ): Promise<PredictionAgentMessage[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) {
      throw new Error(
        `Failed to list prediction agent messages: ${error.message}`,
      );
    }
    return ((data as Row[] | null) ?? []).map((row) => deserialize(row));
  }
}
