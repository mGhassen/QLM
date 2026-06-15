import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { INodeRepository } from '../../repositories';
import {
  NodeOutput as NodeOutputCtor,
  type NodeOutput,
} from '../../usecases/dto/node-usecase-dto';
import type { GetNodeUseCase } from '../../usecases/node/get-node.usecase';

export class GetNodeService implements GetNodeUseCase {
  constructor(private readonly nodeRepository: INodeRepository) {}

  public async execute(id: string): Promise<NodeOutput> {
    const node = await this.nodeRepository.findById(id);
    if (!node) {
      throw DomainException.new({
        code: Code.NODE_NOT_FOUND_ERROR,
        overrideMessage: `Node with id '${id}' not found`,
        data: { nodeId: id },
      });
    }
    return NodeOutputCtor.new(node);
  }
}
