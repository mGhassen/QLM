import type { NodeOutput, UpdateNodeInput } from '../dto';
import type { UseCase } from '../usecase';

export type UpdateNodeUseCase = UseCase<UpdateNodeInput, NodeOutput>;
