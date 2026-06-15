import { http, HttpResponse } from 'msw';

import type {
  Node,
  Pool,
  PoolProvider,
  NodeRegion,
} from '@qlm/domain/entities';
import { POOL_UNCLUSTERED_NAME } from '@qlm/domain/entities';

import { seedNodes } from '../fixtures/nodes';

/**
 * Pools MSW handler — aggregates the in-memory node fixtures by
 * (provider, region, node_pool) so the topology page renders pool cards
 * matching the same fleet data the nodes handler serves.
 */

const stores = new Map<string, Node[]>();

function storeFor(projectId: string): Node[] {
  let s = stores.get(projectId);
  if (!s) {
    s = seedNodes(projectId);
    stores.set(projectId, s);
  }
  return s;
}

function aggregate(nodes: Node[]): Pool[] {
  const map = new Map<string, Pool>();
  for (const n of nodes) {
    const provider: PoolProvider = (n.provider as PoolProvider) ?? 'unknown';
    const name = (n.cluster?.trim() || POOL_UNCLUSTERED_NAME) as string;
    const region = n.region as NodeRegion;
    const id = `${provider}::${region}::${name}`;
    const projectId = n.projectId;

    let pool = map.get(id);
    if (!pool) {
      pool = {
        id,
        projectId,
        name,
        provider,
        region,
        nodeCount: 0,
        totalCpu: 0,
        totalMemoryGb: 0,
        lifecycleCounts: {
          provisioning: 0,
          active: 0,
          stopping: 0,
          stopped: 0,
          terminating: 0,
          terminated: 0,
        },
        healthCounts: {
          healthy: 0,
          degraded: 0,
          critical: 0,
          unknown: 0,
        },
        avgCpuUtilPct: undefined,
        avgMemUtilPct: undefined,
      };
      map.set(id, pool);
    }
    const mut = pool as { -readonly [K in keyof Pool]: Pool[K] };
    mut.nodeCount += 1;
    mut.totalCpu += n.cpuCores;
    mut.totalMemoryGb += n.memoryGb;
    if (n.lifecycle) {
      mut.lifecycleCounts[n.lifecycle] =
        (mut.lifecycleCounts[n.lifecycle] ?? 0) + 1;
    }
    if (n.health) {
      mut.healthCounts[n.health] = (mut.healthCounts[n.health] ?? 0) + 1;
    } else {
      mut.healthCounts.unknown += 1;
    }
  }

  // Second pass — utilization averages.
  const utilSums = new Map<
    string,
    { cpuSum: number; cpuN: number; memSum: number; memN: number }
  >();
  for (const n of nodes) {
    const provider = (n.provider as PoolProvider) ?? 'unknown';
    const name = n.cluster?.trim() || POOL_UNCLUSTERED_NAME;
    const id = `${provider}::${n.region}::${name}`;
    const acc = utilSums.get(id) ?? { cpuSum: 0, cpuN: 0, memSum: 0, memN: 0 };
    if (typeof n.cpuUtilPct === 'number') {
      acc.cpuSum += n.cpuUtilPct;
      acc.cpuN += 1;
    }
    if (typeof n.memUtilPct === 'number') {
      acc.memSum += n.memUtilPct;
      acc.memN += 1;
    }
    utilSums.set(id, acc);
  }
  for (const [id, acc] of utilSums) {
    const pool = map.get(id);
    if (!pool) continue;
    const mut = pool as { -readonly [K in keyof Pool]: Pool[K] };
    if (acc.cpuN > 0) mut.avgCpuUtilPct = acc.cpuSum / acc.cpuN;
    if (acc.memN > 0) mut.avgMemUtilPct = acc.memSum / acc.memN;
  }

  return Array.from(map.values()).sort((a, b) => b.nodeCount - a.nodeCount);
}

function latency<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const poolsHandlers = [
  http.get('/api/pools', async ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    if (!projectId) {
      return HttpResponse.json(
        { error: 'projectId required' },
        { status: 400 },
      );
    }
    const list = storeFor(projectId);
    const items = aggregate(list);
    return HttpResponse.json(await latency({ items }));
  }),
];
