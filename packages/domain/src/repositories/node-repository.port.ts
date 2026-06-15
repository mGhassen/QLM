import type {
  MetricsPoint,
  MetricsRange,
  Node,
  NodeDrain,
  NodeEligibility,
  NodeLifecycleState,
} from '../entities';
import type {
  BulkResult,
  ListNodesInput,
  ListNodesRepositoryResult,
} from '../usecases/dto';
import { RepositoryPort } from './base-repository.port';

export abstract class INodeRepository extends RepositoryPort<Node, string> {
  public abstract findByOrganizationId(
    organizationId: string,
    input?: Omit<ListNodesInput, 'projectId'>,
  ): Promise<ListNodesRepositoryResult>;

  public abstract bulkDelete(ids: string[]): Promise<BulkResult>;

  public abstract getMetrics(
    id: string,
    range: MetricsRange,
  ): Promise<MetricsPoint[]>;

  // ---------------------------------------------------------------
  // RFC 0026 — 5-axis state mutations.
  // ---------------------------------------------------------------

  /**
   * Set the node's lifecycle axis (operator intent). Throws
   * `DomainException(NODE_VERSION_CONFLICT)` on optimistic-concurrency
   * mismatch.
   */
  public abstract setLifecycle(
    id: string,
    lifecycle: NodeLifecycleState,
    expectedVersion: number,
  ): Promise<Node>;

  /**
   * Set the node's scheduling eligibility (operator intent). Orthogonal
   * to drain — both can be set independently.
   */
  public abstract setEligibility(
    id: string,
    eligibility: NodeEligibility,
    expectedVersion: number,
  ): Promise<Node>;

  /**
   * Upsert (or clear, when passed `null`) the structured drain row for
   * a node. Caller is responsible for setting `started_at` /
   * `completed_at` semantics.
   */
  public abstract setDrain(
    id: string,
    drain: NodeDrain | null,
    expectedVersion: number,
  ): Promise<Node>;
}
