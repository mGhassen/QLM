import type {
  MetricsPoint,
  MetricsRange,
  Node,
  NodeDrain,
  NodeEligibility,
  NodeLifecycleState,
} from '@guepard/domain/entities';
import { INodeRepository } from '@guepard/domain/repositories';
import type {
  BulkResult,
  ListNodesInput,
  ListNodesRepositoryResult,
} from '@guepard/domain/usecases';

const UNSUPPORTED =
  'Server-side NodeRepository is not implemented — nodes are a frontend-only feature in Phase 1–7 (mocked via MSW). Add a real adapter when the backend ships.';

/**
 * Throwing stub so the server `Repositories` bag satisfies the domain
 * contract without shipping a Supabase/node implementation that isn't
 * needed yet. If any server route accidentally reaches for `repositories.node`
 * we want a loud failure, not silent no-ops.
 */
export class ServerNodeRepositoryStub extends INodeRepository {
  async findAll(): Promise<Node[]> {
    throw new Error(UNSUPPORTED);
  }

  async findById(_id: string): Promise<Node | null> {
    throw new Error(UNSUPPORTED);
  }

  async findBySlug(_slug: string): Promise<Node | null> {
    throw new Error(UNSUPPORTED);
  }

  async findByOrganizationId(
    _organizationId: string,
    _input?: Omit<ListNodesInput, 'projectId'>,
  ): Promise<ListNodesRepositoryResult> {
    throw new Error(UNSUPPORTED);
  }

  async create(_entity: Node): Promise<Node> {
    throw new Error(UNSUPPORTED);
  }

  async update(_entity: Node): Promise<Node> {
    throw new Error(UNSUPPORTED);
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error(UNSUPPORTED);
  }

  async bulkDelete(_ids: string[]): Promise<BulkResult> {
    throw new Error(UNSUPPORTED);
  }

  async getMetrics(_id: string, _range: MetricsRange): Promise<MetricsPoint[]> {
    throw new Error(UNSUPPORTED);
  }

  async setLifecycle(
    _id: string,
    _lifecycle: NodeLifecycleState,
    _expectedVersion: number,
  ): Promise<Node> {
    throw new Error(UNSUPPORTED);
  }

  async setEligibility(
    _id: string,
    _eligibility: NodeEligibility,
    _expectedVersion: number,
  ): Promise<Node> {
    throw new Error(UNSUPPORTED);
  }

  async setDrain(
    _id: string,
    _drain: NodeDrain | null,
    _expectedVersion: number,
  ): Promise<Node> {
    throw new Error(UNSUPPORTED);
  }
}
