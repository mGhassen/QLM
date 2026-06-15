import type { PredictionAgentMessage } from '@qlm/domain/entities';
import { IPredictionAgentMessageRepository } from '@qlm/domain/repositories';

import { apiGet, apiPost } from './api-client';

type WireMessage = Omit<PredictionAgentMessage, 'createdAt'> & {
  createdAt: string;
};

function fromWire(m: WireMessage): PredictionAgentMessage {
  return { ...m, createdAt: new Date(m.createdAt) };
}

export class PredictionAgentMessageHttpRepository extends IPredictionAgentMessageRepository {
  public async create(
    message: PredictionAgentMessage,
  ): Promise<PredictionAgentMessage> {
    const wire = await apiPost<WireMessage>(
      `/predictions/conversations/${message.conversationId}/messages`,
      { role: message.role, content: message.content },
    );
    return fromWire(wire);
  }

  public async listByConversation(
    conversationId: string,
  ): Promise<PredictionAgentMessage[]> {
    const wire = await apiGet<WireMessage[]>(
      `/predictions/conversations/${conversationId}/messages`,
      false,
    );
    return (wire ?? []).map(fromWire);
  }
}
