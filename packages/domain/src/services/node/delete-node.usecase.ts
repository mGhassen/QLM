import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { INodeRepository } from '../../repositories';
import type { DeleteNodeUseCase } from '../../usecases/node/delete-node.usecase';

export class DeleteNodeService implements DeleteNodeUseCase {
  constructor(private readonly nodeRepository: INodeRepository) {}

  public async execute(id: string): Promise<boolean> {
    const existing = await this.nodeRepository.findById(id);
    if (!existing) {
      throw DomainException.new({
        code: Code.NODE_NOT_FOUND_ERROR,
        overrideMessage: `Node with id '${id}' not found`,
        data: { nodeId: id },
      });
    }
    return await this.nodeRepository.delete(id);
  }
}
