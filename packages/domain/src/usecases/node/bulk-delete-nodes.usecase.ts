import type { BulkDeleteNodesInput, BulkResult } from '../dto';
import type { UseCase } from '../usecase';

export type BulkDeleteNodesUseCase = UseCase<BulkDeleteNodesInput, BulkResult>;
