import { Code } from '../../common/code';
import type { NodeDrain } from '../../entities';
import { DomainException } from '../../exceptions';
import { INodeRepository } from '../../repositories';
import {
  NodeOutput as NodeOutputCtor,
  type DrainNodeInput,
  type NodeOutput,
} from '../../usecases/dto/node-usecase-dto';

/**
 * Start a drain on a node. Optionally also flips eligibility to
 * `ineligible` in the same transaction (the recommended UI default).
 *
 * Decoupled from eligibility per RFC 0026 §5.5a — caller may drain a
 * node without flipping eligibility for the rare "drain but keep
 * trickle traffic" path.
 */
export class DrainNodeService {
  constructor(private readonly nodeRepository: INodeRepository) {}

  public async execute(input: DrainNodeInput): Promise<NodeOutput> {
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

    const drain: NodeDrain = {
      active: true,
      deadline: input.deadline,
      ignoreSystemJobs: input.ignoreSystemJobs ?? false,
      force: input.force ?? false,
      startedAt: new Date().toISOString(),
    };

    const afterDrain = await this.nodeRepository.setDrain(
      input.id,
      drain,
      input.expectedVersion,
    );

    if (input.setIneligibleOnStart ?? true) {
      const updated = await this.nodeRepository.setEligibility(
        input.id,
        'ineligible',
        afterDrain.version,
      );
      return NodeOutputCtor.new(updated);
    }

    return NodeOutputCtor.new(afterDrain);
  }
}
