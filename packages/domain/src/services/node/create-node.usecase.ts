import { NodeEntity } from '../../entities';
import { INodeRepository } from '../../repositories';
import type { CreateNodeInput, NodeOutput } from '../../usecases/dto';
import type { CreateNodeUseCase } from '../../usecases/node/create-node.usecase';
import { NodeOutput as NodeOutputCtor } from '../../usecases/dto/node-usecase-dto';

export class CreateNodeService implements CreateNodeUseCase {
  constructor(private readonly nodeRepository: INodeRepository) {}

  public async execute(input: CreateNodeInput): Promise<NodeOutput> {
    const entity = NodeEntity.create(input);
    const node = await this.nodeRepository.create(entity);
    return NodeOutputCtor.new(node);
  }
}
