import { v4 as uuidv4 } from 'uuid';

import type { PredictionAgentMessage } from '../../entities';
import type {
  IPredictionAgentConversationRepository,
  IPredictionAgentMessageRepository,
} from '../../repositories';
import type {
  AppendAgentMessageInput,
  AppendAgentMessageUseCase,
  PredictionAgentMessageOutput,
} from '../../usecases';
import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';

export class AppendAgentMessageService implements AppendAgentMessageUseCase {
  constructor(
    private readonly messages: IPredictionAgentMessageRepository,
    private readonly conversations: IPredictionAgentConversationRepository,
  ) {}

  public async execute(
    input: AppendAgentMessageInput,
  ): Promise<PredictionAgentMessageOutput> {
    const conversation = await this.conversations.findById(
      input.conversationId,
    );
    if (!conversation) {
      throw DomainException.new({
        code: Code.PREDICTION_CONVERSATION_NOT_FOUND_ERROR,
        overrideMessage: `Conversation '${input.conversationId}' not found.`,
        data: { id: input.conversationId },
      });
    }

    const message: PredictionAgentMessage = {
      id: uuidv4(),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      createdAt: new Date(),
    };
    const persisted = await this.messages.create(message);
    await this.conversations.touch(input.conversationId);
    return persisted;
  }
}
