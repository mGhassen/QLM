import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import type { IPredictionSchemaSnapshotRepository } from '../../repositories';
import type {
  GetSnapshotByIdInput,
  GetSnapshotByIdUseCase,
  PredictionSchemaSnapshotOutput,
} from '../../usecases';

export class GetSnapshotByIdService implements GetSnapshotByIdUseCase {
  constructor(
    private readonly repository: IPredictionSchemaSnapshotRepository,
  ) {}

  public async execute(
    input: GetSnapshotByIdInput,
  ): Promise<PredictionSchemaSnapshotOutput> {
    const snapshot = await this.repository.findById(input.id);
    if (!snapshot) {
      throw DomainException.new({
        code: Code.PREDICTION_SNAPSHOT_NOT_FOUND_ERROR,
        overrideMessage: `Prediction snapshot '${input.id}' not found.`,
        data: { id: input.id },
      });
    }
    return snapshot;
  }
}
