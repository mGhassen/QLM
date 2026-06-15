import type { ListNodesInput, ListNodesOutput } from '../dto';
import type { UseCase } from '../usecase';

export type ListNodesByProjectUseCase = UseCase<
  ListNodesInput,
  ListNodesOutput
>;
