import type { Node, NodeHealth } from '../../entities/node.type';

import { HEALTH_THRESHOLDS } from './health-thresholds';

/**
 * Snapshot of fast-changing observability data for a single node.
 * Mirrors the relevant subset of `public.node_runtime_state`.
 */
export type NodeRuntimeSnapshot = {
  cpuUtilPct?: number | null;
  memUtilPct?: number | null;
};

/**
 * Pure function that derives a node's health from its observable
 * inputs. RFC 0026 §5.5.
 *
 * Inputs:
 *   - `node.orchestration` — observed orchestrator state.
 *   - `node.lastHeartbeatAt` — recency of agent contact.
 *   - `runtime.cpuUtilPct` / `memUtilPct` — current load.
 *
 * Output: one of `healthy | degraded | critical | unknown`.
 *
 * NEVER persisted. The adapter applies this on read; topology
 * aggregations compute equivalent counts in SQL using the same
 * thresholds (`HEALTH_THRESHOLDS`).
 */
export function deriveNodeHealth(
  node: Pick<Node, 'orchestration' | 'lastHeartbeatAt'>,
  runtime: NodeRuntimeSnapshot | null | undefined,
): NodeHealth {
  if (!runtime || !node.lastHeartbeatAt) return 'unknown';

  if (node.orchestration === 'down' || node.orchestration === 'disconnected') {
    return 'critical';
  }

  const cpu = runtime.cpuUtilPct ?? null;
  const mem = runtime.memUtilPct ?? null;

  if (cpu == null && mem == null) return 'unknown';

  if (
    (cpu != null && cpu >= HEALTH_THRESHOLDS.CPU_CRITICAL) ||
    (mem != null && mem >= HEALTH_THRESHOLDS.MEM_CRITICAL)
  ) {
    return 'critical';
  }

  if (
    (cpu != null && cpu >= HEALTH_THRESHOLDS.CPU_HIGH) ||
    (mem != null && mem >= HEALTH_THRESHOLDS.MEM_HIGH)
  ) {
    return 'degraded';
  }

  return 'healthy';
}
