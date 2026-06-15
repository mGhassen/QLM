import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { INodeRepository } from '../../repositories';
import {
  NodeOutput as NodeOutputCtor,
  type NodeOutput,
  type SetNodeEligibilityInput,
} from '../../usecases/dto/node-usecase-dto';

/**
 * Set the operator-intent scheduling eligibility. Orthogonal to drain.
 * RFC 0026 §5.5a permits `eligibility=eligible` with `drain.active=true`
 * (the rare trickle-traffic path).
 */
export class SetNodeEligibilityService {
  constructor(private readonly nodeRepository: INodeRepository) {}

  public async execute(input: SetNodeEligibilityInput): Promise<NodeOutput> {
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

    const updated = await this.nodeRepository.setEligibility(
      input.id,
      input.eligibility,
      input.expectedVersion,
    );
    return NodeOutputCtor.new(updated);
  }
}
