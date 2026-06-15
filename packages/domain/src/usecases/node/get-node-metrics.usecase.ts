import type { GetNodeMetricsInput, MetricsPoint } from '../dto';
import type { UseCase } from '../usecase';

export type GetNodeMetricsUseCase = UseCase<
  GetNodeMetricsInput,
  MetricsPoint[]
>;
