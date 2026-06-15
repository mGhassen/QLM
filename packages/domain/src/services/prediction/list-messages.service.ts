import type { IPredictionAgentMessageRepository } from '../../repositories';
import type {
  ListAgentMessagesInput,
  ListAgentMessagesUseCase,
  PredictionAgentMessageOutput,
} from '../../usecases';

export class ListAgentMessagesService implements ListAgentMessagesUseCase {
  constructor(private readonly messages: IPredictionAgentMessageRepository) {}

  public async execute(
    input: ListAgentMessagesInput,
  ): Promise<PredictionAgentMessageOutput[]> {
    return this.messages.listByConversation(input.conversationId);
  }
}
