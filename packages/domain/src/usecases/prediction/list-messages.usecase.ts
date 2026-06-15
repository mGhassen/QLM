import type {
  ListAgentMessagesInput,
  PredictionAgentMessageOutput,
} from '../dto/prediction-usecase-dto';
import type { UseCase } from '../usecase';

export type ListAgentMessagesUseCase = UseCase<
  ListAgentMessagesInput,
  PredictionAgentMessageOutput[]
>;
