import type { NodeHealth, NodeLifecycleState } from '../../entities/node.type';

/**
 * Aggregate readout of a project's compute fleet. Computed by
 * `FleetAggregateService.summary` — both the topology and the
 * infrastructure UIs consume this so the numbers stay consistent.
 */
export type FleetSummary = {
  /** Total number of nodes in the project. */
  total: number;
  /** Sum of allocated vCPUs across the fleet. */
  totalCpu: number;
  /** Sum of allocated memory (GB) across the fleet. */
  totalMem: number;
  /** Average CPU utilization (0-100) across nodes that report metrics. */
  avgCpuUtil?: number;
  /** Average memory utilization (0-100) across nodes that report metrics. */
  avgMemUtil?: number;
  /** Per-lifecycle node counts (operator intent). RFC 0026 §5. */
  lifecycleCounts: Record<NodeLifecycleState, number>;
  /** Per-health node counts (derived). RFC 0026 §5.5. */
  healthCounts: Record<NodeHealth, number>;
  /** Distinct region count. */
  regions: number;
  /** Distinct cluster (`node_pool`) count, excluding unclustered nodes. */
  clusters: number;
  /** Distinct provider count, including `unknown`. */
  providers: number;
};
