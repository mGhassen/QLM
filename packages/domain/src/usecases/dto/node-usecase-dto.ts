import { Exclude, Expose, plainToClass } from 'class-transformer';

import type {
  MetricsPoint,
  MetricsRange,
  Node,
  NodeEligibility,
  NodeKind,
  NodeLifecycleState,
  NodeProvider,
  NodeRegion,
} from '../../entities';

@Exclude()
export class NodeOutput {
  @Expose()
  public id!: string;
  @Expose()
  public projectId!: string;
  @Expose()
  public name!: string;
  @Expose()
  public kind!: NodeKind;
  @Expose()
  public region!: NodeRegion;
  @Expose()
  public cpuCores!: number;
  @Expose()
  public memoryGb!: number;
  @Expose()
  public tags!: string[];
  @Expose()
  public version!: number;
  @Expose()
  public cpuUtilPct?: number;
  @Expose()
  public memUtilPct?: number;
  @Expose()
  public provider?: NodeProvider;
  @Expose()
  public cluster?: string;
  @Expose()
  public ip?: string;
  @Expose()
  public owner?: string;
  @Expose()
  public lastSeenAt?: string;
  // Phase 2 (RFC 0026) — 5-axis state.
  @Expose()
  public lifecycle?: import('../../entities').NodeLifecycleState;
  @Expose()
  public orchestration?: import('../../entities').NodeOrchestrationState;
  @Expose()
  public eligibility?: import('../../entities').NodeEligibility;
  @Expose()
  public drain?: import('../../entities').NodeDrain;
  @Expose()
  public health?: import('../../entities').NodeHealth;
  @Expose()
  public lastHeartbeatAt?: string;
  @Expose()
  public heartbeatTtlSeconds?: number;
  @Expose()
  public createdAt!: string;
  @Expose()
  public updatedAt!: string;

  public static new(node: Node): NodeOutput {
    return plainToClass(NodeOutput, node);
  }
}

export type CreateNodeInput = {
  projectId: string;
  name: string;
  kind: NodeKind;
  region: NodeRegion;
  cpuCores: number;
  memoryGb: number;
  tags?: string[];
  provider?: NodeProvider;
  cluster?: string;
  ip?: string;
  owner?: string;
};

export type UpdateNodeInput = {
  id: string;
  name?: string;
  tags?: string[];
  kind?: NodeKind;
  region?: NodeRegion;
  cpuCores?: number;
  memoryGb?: number;
  provider?: NodeProvider;
  cluster?: string;
  ip?: string;
  owner?: string;
};

export type NodeSortKey =
  | 'name'
  | 'lifecycle'
  | 'region'
  | 'kind'
  | 'cpuCores'
  | 'memoryGb'
  | 'createdAt'
  | 'updatedAt'
  | 'lastSeenAt';

export type NodeSort = {
  key: NodeSortKey;
  direction: 'asc' | 'desc';
};

export type ListNodesInput = {
  projectId: string;
  cursor?: string | null;
  limit?: number;
  search?: string;
  lifecycle?: NodeLifecycleState[];
  eligibility?: NodeEligibility[];
  region?: NodeRegion[];
  provider?: NodeProvider[];
  sort?: NodeSort;
};

export type NodeFacets = {
  lifecycle: Partial<Record<NodeLifecycleState, number>>;
  region: Partial<Record<NodeRegion, number>>;
  provider: Partial<Record<NodeProvider, number>>;
};

/**
 * Envelope returned by a repository adapter. `items` are raw domain
 * entities — the service layer wraps them into `NodeOutput`s before
 * returning the presentation-facing envelope (`ListNodesOutput`).
 */
export type ListNodesRepositoryResult = {
  items: Node[];
  total: number;
  nextCursor: string | null;
  facets: NodeFacets;
};

export type ListNodesOutput = {
  items: NodeOutput[];
  total: number;
  nextCursor: string | null;
  facets: NodeFacets;
};

export type BulkDeleteNodesInput = {
  ids: string[];
};

export type BulkResult = {
  succeeded: string[];
  failed: { id: string; reason: string }[];
};

export type GetNodeMetricsInput = {
  id: string;
  range: MetricsRange;
};

// ---------------------------------------------------------------------
// Phase 2 — node state decomposition (RFC 0026)
// ---------------------------------------------------------------------

export type DrainNodeInput = {
  id: string;
  /** ISO timestamp; absent = no-deadline drain. */
  deadline?: string;
  ignoreSystemJobs?: boolean;
  force?: boolean;
  /**
   * When `true` (recommended default), the service writes both the
   * drain row AND `eligibility = 'ineligible'` in one transaction.
   * When `false`, only the drain row is written — caller wants the
   * rare "drain but keep accepting trickle traffic" path. RFC §5.5a.
   */
  setIneligibleOnStart?: boolean;
  expectedVersion: number;
};

export type DrainCancelInput = {
  id: string;
  /** When `true` (default), eligibility stays `ineligible` after cancel. */
  keepIneligible?: boolean;
  expectedVersion: number;
};

export type SetNodeEligibilityInput = {
  id: string;
  eligibility: NodeEligibility;
  expectedVersion: number;
};

export type SetNodeLifecycleInput = {
  id: string;
  lifecycle: NodeLifecycleState;
  expectedVersion: number;
};

export type { MetricsPoint, MetricsRange };
