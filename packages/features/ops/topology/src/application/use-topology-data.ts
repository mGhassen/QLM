import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  POOL_UNCLUSTERED_NAME,
  type Node,
  type NodeHealth,
  type NodeLifecycleState,
  type NodeProvider,
  type Pool,
} from '@guepard/domain/entities';
import type { FleetSummary, PressurePoint } from '@guepard/domain/usecases';
import { useShell } from '@guepard/shell-runtime';

export type TopologyPool = Readonly<{
  /** Logical pool key — provider + region + cluster (or fallback). */
  id: string;
  provider: NodeProvider | 'unknown';
  region: string;
  cluster?: string;
  nodes: Node[];
  totalCpu: number;
  totalMem: number;
  avgCpuUtil?: number;
  avgMemUtil?: number;
  healthCounts: Record<NodeHealth, number>;
  lifecycleCounts: Record<NodeLifecycleState, number>;
}>;

export type { FleetSummary, PressurePoint };

export function useTopologyData(projectId: string) {
  const shell = useShell();

  const nodesQuery = useQuery({
    queryKey: shell.nodes.keys.listByProject(projectId),
    queryFn: () => shell.nodes.list({ projectId }),
    enabled: !!projectId,
  });

  const poolsQuery = useQuery({
    queryKey: shell.fleet.keys.pools(projectId),
    queryFn: () => shell.fleet.pools({ projectId }),
    enabled: !!projectId,
  });

  const summaryQuery = useQuery({
    queryKey: shell.fleet.keys.summary(projectId),
    queryFn: () => shell.fleet.summary({ projectId }),
    enabled: !!projectId,
  });

  const pressureQuery = useQuery({
    queryKey: shell.fleet.keys.pressure(projectId),
    queryFn: () => shell.fleet.pressurePoints({ projectId }),
    enabled: !!projectId,
  });

  const rows: Node[] = useMemo(
    () => (nodesQuery.data?.items ?? []) as Node[],
    [nodesQuery.data],
  );

  const pools: TopologyPool[] = useMemo(
    () => mergePoolsWithNodes(poolsQuery.data ?? [], rows),
    [poolsQuery.data, rows],
  );

  return {
    nodesQuery,
    poolsQuery,
    summaryQuery,
    pressureQuery,
    rows,
    pools,
    summary: summaryQuery.data,
    pressurePoints: pressureQuery.data ?? [],
  } as const;
}

/**
 * Merge the server-aggregated `Pool[]` with their matching `Node[]` so
 * the pool detail sheet can still render per-pool node lists.
 *
 * Pool keying mirrors the SQL view's id format:
 * `${provider}::${region}::${name}` where name is the `node_pool` value
 * or `__unclustered__`. Node-side join uses `cluster ?? unclustered`.
 */
function mergePoolsWithNodes(domainPools: Pool[], nodes: Node[]): TopologyPool[] {
  const nodesByPoolId = new Map<string, Node[]>();
  for (const n of nodes) {
    const provider = n.provider ?? 'unknown';
    const cluster = n.cluster?.trim() || POOL_UNCLUSTERED_NAME;
    const id = `${provider}::${n.region}::${cluster}`;
    const bucket = nodesByPoolId.get(id);
    if (bucket) bucket.push(n);
    else nodesByPoolId.set(id, [n]);
  }

  const out: TopologyPool[] = domainPools.map((p) => {
    const cluster = p.name === POOL_UNCLUSTERED_NAME ? undefined : p.name;
    return {
      id: p.id,
      provider: p.provider,
      region: p.region,
      cluster,
      nodes: nodesByPoolId.get(p.id) ?? [],
      totalCpu: p.totalCpu,
      totalMem: p.totalMemoryGb,
      avgCpuUtil:
        p.avgCpuUtilPct === undefined ? undefined : Math.round(p.avgCpuUtilPct),
      avgMemUtil:
        p.avgMemUtilPct === undefined ? undefined : Math.round(p.avgMemUtilPct),
      healthCounts: { ...p.healthCounts },
      lifecycleCounts: { ...p.lifecycleCounts },
    };
  });

  return out.sort((a, b) => b.nodes.length - a.nodes.length);
}
