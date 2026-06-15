import type { PredictionAgentConversation } from '@guepard/domain/entities';
import { IPredictionAgentConversationRepository } from '@guepard/domain/repositories';

import type { SupabaseClientType } from './types';

const TABLE = 'prediction_agent_conversations' as const;

type Row = {
  id: string;
  snapshot_id: string;
  project_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function deserialize(row: Row): PredictionAgentConversation {
  return {
    id: row.id,
    snapshotId: row.snapshot_id,
    projectId: row.project_id,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class PredictionAgentConversationRepository extends IPredictionAgentConversationRepository {
  constructor(private readonly client: SupabaseClientType) {
    super();
  }

  public async create(
    conversation: PredictionAgentConversation,
  ): Promise<PredictionAgentConversation> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert({
        id: conversation.id,
        snapshot_id: conversation.snapshotId,
        project_id: conversation.projectId,
        created_by: conversation.createdBy,
        created_at: conversation.createdAt.toISOString(),
        updated_at: conversation.updatedAt.toISOString(),
      })
      .select('*')
      .single();
    if (error) {
      throw new Error(
        `Failed to create prediction conversation: ${error.message}`,
      );
    }
    return deserialize(data as Row);
  }

  public async findById(
    id: string,
  ): Promise<PredictionAgentConversation | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new Error(
        `Failed to fetch prediction conversation: ${error.message}`,
      );
    }
    return data ? deserialize(data as Row) : null;
  }

  public async listBySnapshot(
    snapshotId: string,
  ): Promise<PredictionAgentConversation[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('snapshot_id', snapshotId)
      .order('created_at', { ascending: false });
    if (error) {
      throw new Error(
        `Failed to list prediction conversations: ${error.message}`,
      );
    }
    return ((data as Row[] | null) ?? []).map((row) => deserialize(row));
  }

  public async touch(id: string): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      throw new Error(
        `Failed to touch prediction conversation: ${error.message}`,
      );
    }
  }
}
