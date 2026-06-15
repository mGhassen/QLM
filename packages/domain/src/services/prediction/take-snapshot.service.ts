import { v4 as uuidv4 } from 'uuid';

import { Code } from '../../common/code';
import {
  type PredictionSchemaSnapshot,
  PredictionSchemaSnapshotZodSchema,
} from '../../entities';
import { DomainException } from '../../exceptions';
import type { IPredictionSchemaSnapshotRepository } from '../../repositories';
import type {
  PredictionSchemaSnapshotOutput,
  TakeSnapshotInput,
  TakeSnapshotUseCase,
} from '../../usecases';

const FIVE_MB = 5 * 1024 * 1024;

export class TakeSnapshotService implements TakeSnapshotUseCase {
  constructor(
    private readonly repository: IPredictionSchemaSnapshotRepository,
  ) {}

  public async execute(
    input: TakeSnapshotInput,
  ): Promise<PredictionSchemaSnapshotOutput> {
    const serialized = JSON.stringify(input.metadata ?? {});
    if (Buffer.byteLength(serialized, 'utf8') > FIVE_MB) {
      throw DomainException.new({
        code: Code.PREDICTION_SNAPSHOT_TOO_LARGE_ERROR,
        overrideMessage:
          'Schema metadata exceeds the 5 MB phase-1 cap. Phase 2 will lift this.',
      });
    }

    const latest = await this.repository.findLatestByDatasource(
      input.datasourceId,
    );
    const nextVersion = (latest?.version ?? 0) + 1;
    const now = new Date();

    const candidate: PredictionSchemaSnapshot = {
      id: uuidv4(),
      datasourceId: input.datasourceId,
      projectId: input.projectId,
      version: nextVersion,
      metadata: input.metadata,
      takenBy: input.takenBy,
      takenAt: now,
    };

    const validated = PredictionSchemaSnapshotZodSchema.parse(candidate);
    return this.repository.create(validated);
  }
}
