import type {
  Node,
  NodeHealth,
  NodeLifecycleState,
  NodeProvider,
  Pool,
} from '../../entities';
import type { INodeRepository } from '../../repositories/node-repository.port';
import type { IPoolRepository } from '../../repositories/pool-repository.port';
import {
  HIGH_CPU_PCT,
  HIGH_MEM_PCT,
  type FleetSummary,
  type PressurePoint,
} from '../../usecases/fleet';

/**
 * Single source of truth for "where is the fleet?" numbers. Composes
 * `INodeRepository` + `IPoolRepository`. Both topology and infrastructure
 * UIs consume through `shell.fleet.*` so they always see identical
 * aggregates.
 *
 * Methods:
 *   - `summary(orgId)`         → totals + lifecycle/health counts + structure counts
 *   - `pools(orgId)`           → delegates to pool repo (read-through)
 *   - `pressurePoints(orgId)`  → top concerns (>85% CPU/mem, unreachable, failing)
 */
export class FleetAggregateService {
  constructor(
    private readonly nodes: INodeRepository,
    private readonly pools: IPoolRepository,
  ) {}

  public async summary(organizationId: string): Promise<FleetSummary> {
    const result = await this.nodes.findByOrganizationId(organizationId);
    return computeSummary(result.items as Node[]);
  }

  public async listPools(organizationId: string): Promise<Pool[]> {
    return this.pools.findByOrganizationId(organizationId);
  }

  public async pressurePoints(
    organizationId: string,
  ): Promise<PressurePoint[]> {
    const result = await this.nodes.findByOrganizationId(organizationId);
    return computePressurePoints(result.items as Node[]);
  }
}

function computeSummary(rows: Node[]): FleetSummary {
  let totalCpu = 0;
  let totalMem = 0;
  let cpuUtilSum = 0;
  let cpuUtilN = 0;
  let memUtilSum = 0;
  let memUtilN = 0;
  const lifecycleCounts: Record<NodeLifecycleState, number> = {
    provisioning: 0,
    active: 0,
    stopping: 0,
    stopped: 0,
    terminating: 0,
    terminated: 0,
  };
  const healthCounts: Record<NodeHealth, number> = {
    healthy: 0,
    degraded: 0,
    critical: 0,
    unknown: 0,
  };
  const regions = new Set<string>();
  const clusters = new Set<string>();
  const providers = new Set<NodeProvider | 'unknown'>();
  for (const n of rows) {
    totalCpu += n.cpuCores;
    totalMem += n.memoryGb;
    if (n.lifecycle) lifecycleCounts[n.lifecycle]++;
    healthCounts[n.health ?? 'unknown']++;
    regions.add(n.region);
    if (n.cluster) clusters.add(n.cluster);
    providers.add(n.provider ?? 'unknown');
    if (typeof n.cpuUtilPct === 'number') {
      cpuUtilSum += n.cpuUtilPct;
      cpuUtilN++;
    }
    if (typeof n.memUtilPct === 'number') {
      memUtilSum += n.memUtilPct;
      memUtilN++;
    }
  }
  return {
    total: rows.length,
    totalCpu,
    totalMem,
    avgCpuUtil: cpuUtilN ? Math.round(cpuUtilSum / cpuUtilN) : undefined,
    avgMemUtil: memUtilN ? Math.round(memUtilSum / memUtilN) : undefined,
    lifecycleCounts,
    healthCounts,
    regions: regions.size,
    clusters: clusters.size,
    providers: providers.size,
  };
}

/**
 * Pressure points surface the worst nodes first. Vocabulary mirrors
 * RFC 0026 §5.6: orchestration down → unreachable; health critical →
 * failing; high CPU / memory → highCpu / highMem.
 */
function computePressurePoints(rows: Node[]): PressurePoint[] {
  const points: PressurePoint[] = [];
  for (const n of rows) {
    if (n.orchestration === 'down' || n.orchestration === 'disconnected') {
      points.push({
        kind: 'unreachable',
        nodeId: n.id,
        nodeName: n.name,
        value: 1,
      });
      continue;
    }
    if (n.health === 'critical') {
      points.push({
        kind: 'failing',
        nodeId: n.id,
        nodeName: n.name,
        value: 1,
      });
      continue;
    }
    if (typeof n.cpuUtilPct === 'number' && n.cpuUtilPct >= HIGH_CPU_PCT) {
      points.push({
        kind: 'highCpu',
        nodeId: n.id,
        nodeName: n.name,
        value: Math.round(n.cpuUtilPct),
      });
    }
    if (typeof n.memUtilPct === 'number' && n.memUtilPct >= HIGH_MEM_PCT) {
      points.push({
        kind: 'highMem',
        nodeId: n.id,
        nodeName: n.name,
        value: Math.round(n.memUtilPct),
      });
    }
  }
  // Sort: presence-marker kinds first, then highest util descending.
  const PRESENCE = new Set<PressurePoint['kind']>([
    'unreachable',
    'failing',
    'criticalHealth',
  ]);
  return points.sort((a, b) => {
    const aPresence = PRESENCE.has(a.kind);
    const bPresence = PRESENCE.has(b.kind);
    if (aPresence && !bPresence) return -1;
    if (bPresence && !aPresence) return 1;
    return b.value - a.value;
  });
}
