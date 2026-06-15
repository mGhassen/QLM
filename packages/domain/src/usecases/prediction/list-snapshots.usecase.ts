import type {
  ListSnapshotsByDatasourceInput,
  PredictionSchemaSnapshotOutput,
} from '../dto/prediction-usecase-dto';
import type { UseCase } from '../usecase';

export type ListSnapshotsByDatasourceUseCase = UseCase<
  ListSnapshotsByDatasourceInput,
  PredictionSchemaSnapshotOutput[]
>;
