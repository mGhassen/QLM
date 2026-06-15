import { INodeRepository } from '../../repositories';
import type { BulkDeleteNodesInput, BulkResult } from '../../usecases/dto';
import type { BulkDeleteNodesUseCase } from '../../usecases/node/bulk-delete-nodes.usecase';

export class BulkDeleteNodesService implements BulkDeleteNodesUseCase {
  constructor(private readonly nodeRepository: INodeRepository) {}

  public async execute(input: BulkDeleteNodesInput): Promise<BulkResult> {
    if (input.ids.length === 0) {
      return { succeeded: [], failed: [] };
    }
    return await this.nodeRepository.bulkDelete(input.ids);
  }
}
