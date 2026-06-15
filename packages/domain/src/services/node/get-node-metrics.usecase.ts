import { INodeRepository } from '../../repositories';
import type { GetNodeMetricsInput, MetricsPoint } from '../../usecases/dto';
import type { GetNodeMetricsUseCase } from '../../usecases/node/get-node-metrics.usecase';

export class GetNodeMetricsService implements GetNodeMetricsUseCase {
  constructor(private readonly nodeRepository: INodeRepository) {}

  public async execute(input: GetNodeMetricsInput): Promise<MetricsPoint[]> {
    return await this.nodeRepository.getMetrics(input.id, input.range);
  }
}
