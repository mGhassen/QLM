import type { CreateNodeInput, NodeOutput } from '../dto';
import type { UseCase } from '../usecase';

export type CreateNodeUseCase = UseCase<CreateNodeInput, NodeOutput>;
