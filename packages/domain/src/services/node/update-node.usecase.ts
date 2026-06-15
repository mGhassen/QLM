import { Code } from '../../common/code';
import { NodeEntity } from '../../entities';
import { DomainException } from '../../exceptions';
import { INodeRepository } from '../../repositories';
import {
  NodeOutput as NodeOutputCtor,
  type NodeOutput,
  type UpdateNodeInput,
} from '../../usecases/dto/node-usecase-dto';
import type { UpdateNodeUseCase } from '../../usecases/node/update-node.usecase';

export class UpdateNodeService implements UpdateNodeUseCase {
  constructor(private readonly nodeRepository: INodeRepository) {}

  public async execute(input: UpdateNodeInput): Promise<NodeOutput> {
    const existing = await this.nodeRepository.findById(input.id);
    if (!existing) {
      throw DomainException.new({
        code: Code.NODE_NOT_FOUND_ERROR,
        overrideMessage: `Node with id '${input.id}' not found`,
        data: { nodeId: input.id },
      });
    }

    const entity = NodeEntity.update(existing, input);
    const node = await this.nodeRepository.update(entity);
    return NodeOutputCtor.new(node);
  }
}
