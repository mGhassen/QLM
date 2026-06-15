import type { NodeOutput } from '../dto';
import type { UseCase } from '../usecase';

export type GetNodeUseCase = UseCase<string, NodeOutput>;
