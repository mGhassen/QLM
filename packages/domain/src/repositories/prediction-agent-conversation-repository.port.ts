import type { PredictionAgentConversation } from '../entities';

export abstract class IPredictionAgentConversationRepository {
  public abstract create(
    conversation: PredictionAgentConversation,
  ): Promise<PredictionAgentConversation>;
  public abstract findById(
    id: string,
  ): Promise<PredictionAgentConversation | null>;
  public abstract listBySnapshot(
    snapshotId: string,
  ): Promise<PredictionAgentConversation[]>;
  public abstract touch(id: string): Promise<void>;
}
