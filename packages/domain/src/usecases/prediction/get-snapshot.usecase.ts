import type {
  GetSnapshotByIdInput,
  PredictionSchemaSnapshotOutput,
} from '../dto/prediction-usecase-dto';
import type { UseCase } from '../usecase';

export type GetSnapshotByIdUseCase = UseCase<
  GetSnapshotByIdInput,
  PredictionSchemaSnapshotOutput
>;
