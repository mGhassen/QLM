import type {
  AppendAgentMessageInput,
  PredictionAgentMessageOutput,
} from '../dto/prediction-usecase-dto';
import type { UseCase } from '../usecase';

export type AppendAgentMessageUseCase = UseCase<
  AppendAgentMessageInput,
  PredictionAgentMessageOutput
>;
