import type { PredictionAgentMessage } from '../entities';

/**
 * Append-only repository for prediction agent messages. No `update` /
 * `delete` — messages are immutable once persisted.
 */
export abstract class IPredictionAgentMessageRepository {
  public abstract create(
    message: PredictionAgentMessage,
  ): Promise<PredictionAgentMessage>;
  public abstract listByConversation(
    conversationId: string,
  ): Promise<PredictionAgentMessage[]>;
}
