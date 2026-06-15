import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { INodeRepository } from '../../repositories';
import {
  NodeOutput as NodeOutputCtor,
  type DrainCancelInput,
  type NodeOutput,
} from '../../usecases/dto/node-usecase-dto';

/**
 * Cancel an active drain. Default `keepIneligible: true` matches
 * Nomad's behaviour (a cancelled drain leaves the node ineligible
 * unless the operator explicitly re-enables scheduling).
 */
export class DrainCancelNodeService {
  constructor(private readonly nodeRepository: INodeRepository) {}

  public async execute(input: DrainCancelInput): Promise<NodeOutput> {
    const existing = await this.nodeRepository.findById(input.id);
    if (!existing) {
      throw DomainException.new({
        code: Code.NODE_NOT_FOUND_ERROR,
        overrideMessage: `Node with id '${input.id}' not found`,
        data: { nodeId: input.id },
      });
    }
    if (existing.version !== input.expectedVersion) {
      throw DomainException.new({
        code: Code.NODE_VERSION_CONFLICT_ERROR,
        overrideMessage: `Node '${input.id}' version mismatch — expected ${input.expectedVersion}, got ${existing.version}`,
        data: {
          nodeId: input.id,
          expectedVersion: input.expectedVersion,
          actualVersion: existing.version,
        },
      });
    }

    const cleared = await this.nodeRepository.setDrain(
      input.id,
      null,
      input.expectedVersion,
    );

    if ((input.keepIneligible ?? true) === false) {
      const updated = await this.nodeRepository.setEligibility(
        input.id,
        'eligible',
        cleared.version,
      );
      return NodeOutputCtor.new(updated);
    }

    return NodeOutputCtor.new(cleared);
  }
}
