import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { INodeRepository } from '../../repositories';
import {
  NodeOutput as NodeOutputCtor,
  type NodeOutput,
  type SetNodeLifecycleInput,
} from '../../usecases/dto/node-usecase-dto';

/**
 * Set the operator-intent lifecycle phase. Replaces the legacy
 * `ChangeNodeStatusService` once the migration window closes.
 *
 * Domain does not enforce transition legality here — operator UIs can
 * request transitions; the orchestrator is the source of truth on
 * whether the transition lands. Audit logs (phase 6) capture
 * attempted transitions including illegal ones.
 */
export class SetNodeLifecycleService {
  constructor(private readonly nodeRepository: INodeRepository) {}

  public async execute(input: SetNodeLifecycleInput): Promise<NodeOutput> {
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

    const updated = await this.nodeRepository.setLifecycle(
      input.id,
      input.lifecycle,
      input.expectedVersion,
    );
    return NodeOutputCtor.new(updated);
  }
}
