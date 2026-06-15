import type { DatabaseOutput } from '../dto';
import type { UseCase } from '../usecase';

export type GetDatabaseUseCase = UseCase<string, DatabaseOutput>;
