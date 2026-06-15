import type {
  CreateAgentConversationInput,
  PredictionAgentConversationOutput,
} from '../dto/prediction-usecase-dto';
import type { UseCase } from '../usecase';

export type CreateAgentConversationUseCase = UseCase<
  CreateAgentConversationInput,
  PredictionAgentConversationOutput
>;
