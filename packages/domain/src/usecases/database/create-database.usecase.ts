import type { CreateDatabaseInput, DatabaseOutput } from '../dto';
import type { UseCase } from '../usecase';

export type CreateDatabaseUseCase = UseCase<
  CreateDatabaseInput,
  DatabaseOutput
>;
