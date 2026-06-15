import type { IPredictionSchemaSnapshotRepository } from '../../repositories';
import type {
  ListSnapshotsByDatasourceInput,
  ListSnapshotsByDatasourceUseCase,
  PredictionSchemaSnapshotOutput,
} from '../../usecases';

export class ListSnapshotsByDatasourceService implements ListSnapshotsByDatasourceUseCase {
  constructor(
    private readonly repository: IPredictionSchemaSnapshotRepository,
  ) {}

  public async execute(
    input: ListSnapshotsByDatasourceInput,
  ): Promise<PredictionSchemaSnapshotOutput[]> {
    return this.repository.listByDatasource(input.datasourceId);
  }
}
