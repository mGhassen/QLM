import type {
  PredictionSchemaSnapshotOutput,
  TakeSnapshotInput,
} from '../dto/prediction-usecase-dto';
import type { UseCase } from '../usecase';

export type TakeSnapshotUseCase = UseCase<
  TakeSnapshotInput,
  PredictionSchemaSnapshotOutput
>;
