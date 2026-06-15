import {
  NODE_PROVIDERS,
  NODE_REGIONS,
  POOL_UNCLUSTERED_NAME,
  PoolSchema,
  poolIdOf,
  type Pool,
  type PoolProvider,
} from '@guepard/domain/entities';
import { IPoolRepository } from '@guepard/domain/repositories';
import type { SupabaseClientType } from './types';

/**
 * Read-only adapter over `public.pool_view`. The view groups
 * `public.node` rows by (organization_id, hosting_provider, region,
 * node_pool) and joins `public.node_runtime_state` for utilization
 * averages. RLS on the underlying tables flows through via
 * `security_invoker = true`.
 */
export class PoolRepository extends IPoolRepository {
  constructor(private readonly client: SupabaseClientType) {
    super();
  }

  public async findByOrganizationId(organizationId: string): Promise<Pool[]> {
    const { data, error } = await this.client
      .from('pool_view')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) throw error;
    if (!data) return [];

    const pools: Pool[] = [];
    for (const row of data as PoolRow[]) {
      const pool = mapRowToPool(row);
      if (pool) pools.push(pool);
    }
    return pools;
  }
}

type PoolRow = {
  id: string | null;
  organization_id: string | null;
  name: string | null;
  provider: string | null;
  region: string | null;
  node_count: number | string | null;
  total_cpu: number | string | null;
  total_memory_gb: number | string | null;
  running_count: number | string | null;
  draining_count: number | string | null;
  stopped_count: number | string | null;
  error_count: number | string | null;
  lifecycle_provisioning_count: number | string | null;
  lifecycle_active_count: number | string | null;
  lifecycle_stopping_count: number | string | null;
  lifecycle_stopped_count: number | string | null;
  lifecycle_terminating_count: number | string | null;
  lifecycle_terminated_count: number | string | null;
  health_healthy_count: number | string | null;
  health_degraded_count: number | string | null;
  health_critical_count: number | string | null;
  health_unknown_count: number | string | null;
  avg_cpu_util_pct: number | string | null;
  avg_mem_util_pct: number | string | null;
};

function mapRowToPool(row: PoolRow): Pool | null {
  if (!row.organization_id) return null;

  const provider = normalizeProvider(row.provider);
  const region = normalizeRegion(row.region);
  if (!region) return null;

  const name = row.name?.trim() || POOL_UNCLUSTERED_NAME;

  const candidate = {
    id: row.id ?? poolIdOf(provider, region, name),
    projectId: row.organization_id,
    name,
    provider,
    region,
    nodeCount: toInt(row.node_count),
    totalCpu: toInt(row.total_cpu),
    totalMemoryGb: toFloat(row.total_memory_gb),
    lifecycleCounts: {
      provisioning: toInt(row.lifecycle_provisioning_count),
      active: toInt(row.lifecycle_active_count),
      stopping: toInt(row.lifecycle_stopping_count),
      stopped: toInt(row.lifecycle_stopped_count),
      terminating: toInt(row.lifecycle_terminating_count),
      terminated: toInt(row.lifecycle_terminated_count),
    },
    healthCounts: {
      healthy: toInt(row.health_healthy_count),
      degraded: toInt(row.health_degraded_count),
      critical: toInt(row.health_critical_count),
      unknown: toInt(row.health_unknown_count),
    },
    avgCpuUtilPct:
      row.avg_cpu_util_pct == null ? undefined : toFloat(row.avg_cpu_util_pct),
    avgMemUtilPct:
      row.avg_mem_util_pct == null ? undefined : toFloat(row.avg_mem_util_pct),
  };

  const parsed = PoolSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function normalizeProvider(raw: string | null): PoolProvider {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase();
  if (lower === 'aws' || lower === 'amazon') return 'aws';
  if (lower === 'gcp' || lower === 'google') return 'gcp';
  if (lower === 'azure') return 'azure';
  if (lower === 'on-premise' || lower === 'on-prem' || lower === 'self-hosted')
    return 'on-premise';
  if ((NODE_PROVIDERS as readonly string[]).includes(lower)) {
    return lower as PoolProvider;
  }
  return 'unknown';
}

function normalizeRegion(raw: string | null): Pool['region'] | null {
  if (!raw) return null;
  if ((NODE_REGIONS as readonly string[]).includes(raw)) {
    return raw as Pool['region'];
  }
  return null;
}

function toInt(value: number | string | null): number {
  if (value == null) return 0;
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function toFloat(value: number | string | null): number {
  if (value == null) return 0;
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}
