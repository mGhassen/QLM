import type { DatabaseOutput, UpdateDatabaseInput } from '../dto';
import type { UseCase } from '../usecase';

export type UpdateDatabaseUseCase = UseCase<
  UpdateDatabaseInput,
  DatabaseOutput
>;
