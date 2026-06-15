import type { DatabaseOutput, ListDatabasesInput } from '../dto';
import type { UseCase } from '../usecase';

export type ListDatabasesUseCase = UseCase<
  ListDatabasesInput,
  DatabaseOutput[]
>;
