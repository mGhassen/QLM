import { INodeRepository } from '../../repositories';
import {
  NodeOutput as NodeOutputCtor,
  type ListNodesInput,
  type ListNodesOutput,
} from '../../usecases/dto/node-usecase-dto';
import type { ListNodesByProjectUseCase } from '../../usecases/node/list-nodes-by-project.usecase';

export class ListNodesByProjectService implements ListNodesByProjectUseCase {
  constructor(private readonly nodeRepository: INodeRepository) {}

  public async execute(input: ListNodesInput): Promise<ListNodesOutput> {
    const { projectId, ...rest } = input;
    const result = await this.nodeRepository.findByOrganizationId(
      projectId,
      rest,
    );
    return {
      items: result.items.map((node) => NodeOutputCtor.new(node)),
      total: result.total,
      nextCursor: result.nextCursor,
      facets: result.facets,
    };
  }
}
