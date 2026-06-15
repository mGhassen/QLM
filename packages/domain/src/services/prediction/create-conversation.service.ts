import { v4 as uuidv4 } from 'uuid';

import type { PredictionAgentConversation } from '../../entities';
import type {
  IPredictionAgentConversationRepository,
  IPredictionSchemaSnapshotRepository,
} from '../../repositories';
import type {
  CreateAgentConversationInput,
  CreateAgentConversationUseCase,
  PredictionAgentConversationOutput,
} from '../../usecases';
import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';

export class CreateAgentConversationService implements CreateAgentConversationUseCase {
  constructor(
    private readonly conversations: IPredictionAgentConversationRepository,
    private readonly snapshots: IPredictionSchemaSnapshotRepository,
  ) {}

  public async execute(
    input: CreateAgentConversationInput,
  ): Promise<PredictionAgentConversationOutput> {
    const snapshot = await this.snapshots.findById(input.snapshotId);
    if (!snapshot) {
      throw DomainException.new({
        code: Code.PREDICTION_SNAPSHOT_NOT_FOUND_ERROR,
        overrideMessage: `Snapshot '${input.snapshotId}' not found.`,
        data: { id: input.snapshotId },
      });
    }
    if (snapshot.projectId !== input.projectId) {
      throw DomainException.new({
        code: Code.ACCESS_DENIED_ERROR,
        overrideMessage:
          'Snapshot does not belong to the requested project scope.',
      });
    }

    const now = new Date();
    const conversation: PredictionAgentConversation = {
      id: uuidv4(),
      snapshotId: input.snapshotId,
      projectId: input.projectId,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    return this.conversations.create(conversation);
  }
}
