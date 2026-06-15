import type { PredictionAgentConversation } from '@guepard/domain/entities';
import { IPredictionAgentConversationRepository } from '@guepard/domain/repositories';

import { apiGet, apiPost } from './api-client';

type WireConversation = Omit<
  PredictionAgentConversation,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};

function fromWire(c: WireConversation): PredictionAgentConversation {
  return {
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  };
}

export class PredictionAgentConversationHttpRepository extends IPredictionAgentConversationRepository {
  public async create(
    conversation: PredictionAgentConversation,
  ): Promise<PredictionAgentConversation> {
    const wire = await apiPost<WireConversation>(
      `/predictions/conversations`,
      conversation,
    );
    return fromWire(wire);
  }

  public async findById(
    id: string,
  ): Promise<PredictionAgentConversation | null> {
    const wire = await apiGet<WireConversation>(
      `/predictions/conversations/${id}`,
      true,
    );
    return wire ? fromWire(wire) : null;
  }

  public async listBySnapshot(
    snapshotId: string,
  ): Promise<PredictionAgentConversation[]> {
    const wire = await apiGet<WireConversation[]>(
      `/predictions/snapshots/${snapshotId}/conversations`,
      false,
    );
    return (wire ?? []).map(fromWire);
  }

  public async touch(_id: string): Promise<void> {
    // Server-side touch happens automatically when a message is appended.
    return;
  }
}
