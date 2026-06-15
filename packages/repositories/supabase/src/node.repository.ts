import type {
  MetricsPoint,
  MetricsRange,
  Node,
  NodeDrain,
  NodeEligibility,
  NodeKind,
  NodeLifecycleState,
  NodeOrchestrationState,
  NodeProvider,
  NodeRegion,
} from '@qlm/domain/entities';
import { INodeRepository } from '@qlm/domain/repositories';
import { deriveNodeHealth } from '@qlm/domain/services';
import type {
  BulkResult,
  ListNodesInput,
  ListNodesRepositoryResult,
} from '@qlm/domain/usecases';
import { Code } from '@qlm/domain/common';
import { DomainException } from '@qlm/domain/exceptions';
import type { Enums } from '@qlm/supabase/database';
import type { SupabaseClientType } from './types';

// ─── Enum mappings ───────────────────────────────────────────────────────────

const PROVIDER_TO_SQL: Record<NodeProvider, string> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
  'on-premise': 'On-premise',
};

const SQL_PROVIDER_TO_DOMAIN: Record<string, NodeProvider> = {
  AWS: 'aws',
  GCP: 'gcp',
  Azure: 'azure',
  'On-premise': 'on-premise',
};

// ─── Row type (subset of generated DB types) ─────────────────────────────────

type NodeRow = Record<string, unknown> & {
  node_runtime_state?: {
    health: string | null;
    cpu_util_pct: number | null;
    mem_util_pct: number | null;
    disk_util_pct: number | null;
    last_seen_at: string | null;
  } | null;
  node_drain?: {
    active: boolean;
    deadline: string | null;
    ignore_system_jobs: boolean;
    force: boolean;
    started_at: string | null;
    completed_at: string | null;
  } | null;
};

const NODE_SELECT = `
  *,
  node_runtime_state (
    health,
    cpu_util_pct,
    mem_util_pct,
    disk_util_pct,
    last_seen_at
  ),
  node_drain (
    active,
    deadline,
    ignore_system_jobs,
    force,
    started_at,
    completed_at
  )
`;

function deserializeDrain(raw: NodeRow['node_drain']): NodeDrain | undefined {
  if (!raw) return undefined;
  return {
    active: raw.active,
    deadline: raw.deadline ?? undefined,
    ignoreSystemJobs: raw.ignore_system_jobs,
    force: raw.force,
    startedAt: raw.started_at ?? undefined,
    completedAt: raw.completed_at ?? undefined,
  };
}

export class NodeRepository extends INodeRepository {
  constructor(private readonly client: SupabaseClientType) {
    super();
  }

  // ─── Serialise domain → SQL ───────────────────────────────────────────────

  private serialize(node: Node): Record<string, unknown> {
    return {
      id: node.id,
      organization_id: node.projectId, // projectId holds org ID (migration convention)
      label_name: node.name,
      instance_type: node.kind,
      region: node.region,
      cpu: node.cpuCores,
      memory: node.memoryGb,
      disk_gb: null,
      tags: node.tags,
      hosting_provider: node.provider ? PROVIDER_TO_SQL[node.provider] : null,
      node_pool: node.cluster ?? '',
      ip: node.ip ?? null,
      owner: node.owner ?? null,
      node_type: 'private' as const,
      node_status: 'Down' as const, // legacy `node_status` column kept until DB migration drops it.
      is_deleted: false,
      lifecycle: node.lifecycle ?? 'provisioning',
      orchestration: node.orchestration ?? 'unknown',
      eligibility: node.eligibility ?? 'eligible',
    };
  }

  // ─── Deserialise SQL → domain ─────────────────────────────────────────────

  private deserialize(row: NodeRow): Node {
    const rt = row.node_runtime_state;
    const drain = deserializeDrain(row.node_drain);
    const orchestration =
      (row.orchestration as NodeOrchestrationState) ?? 'unknown';
    const lastHeartbeatAt = rt?.last_seen_at ?? undefined;
    const health = deriveNodeHealth(
      { orchestration, lastHeartbeatAt },
      rt
        ? {
            cpuUtilPct: rt.cpu_util_pct,
            memUtilPct: rt.mem_util_pct,
          }
        : null,
    );

    return {
      id: row.id as string,
      projectId: (row.organization_id as string) ?? '',
      name: (row.label_name as string) ?? '',
      kind: (row.instance_type as NodeKind) ?? 'standard-2',
      region: (row.region as NodeRegion) ?? 'us-east-1',
      cpuCores: (row.cpu as number) ?? 0,
      memoryGb: (row.memory as number) ?? 0,
      tags: (row.tags as string[]) ?? [],
      version: (row.version as number) ?? 1,
      provider: row.hosting_provider
        ? SQL_PROVIDER_TO_DOMAIN[row.hosting_provider as string]
        : undefined,
      cluster: (row.node_pool as string) || undefined,
      ip: (row.ip as string) ?? undefined,
      owner: (row.owner as string) ?? undefined,
      cpuUtilPct: rt?.cpu_util_pct ?? undefined,
      memUtilPct: rt?.mem_util_pct ?? undefined,
      diskGb: typeof row.disk_gb === 'number' ? row.disk_gb : undefined,
      diskUtilPct: rt?.disk_util_pct ?? undefined,
      lastSeenAt: rt?.last_seen_at ?? undefined,
      // RFC 0026 five-axis state.
      lifecycle: (row.lifecycle as NodeLifecycleState) ?? undefined,
      orchestration: row.orchestration ? orchestration : undefined,
      eligibility: (row.eligibility as NodeEligibility) ?? undefined,
      drain,
      health,
      lastHeartbeatAt,
      createdAt: (row.created_at as string) ?? new Date().toISOString(),
      updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    };
  }

  // ─── Base port methods ────────────────────────────────────────────────────

  async findAll(): Promise<Node[]> {
    const { data, error } = await this.client
      .from('node')
      .select(NODE_SELECT)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to fetch nodes: ${error.message}`);
    return (data ?? []).map((row) => this.deserialize(row as NodeRow));
  }

  async findById(id: string): Promise<Node | null> {
    const { data, error } = await this.client
      .from('node')
      .select(NODE_SELECT)
      .eq('id', id)
      .eq('is_deleted', false)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch node: ${error.message}`);
    }
    return data ? this.deserialize(data as NodeRow) : null;
  }

  async findBySlug(_slug: string): Promise<Node | null> {
    throw new Error('NodeRepository.findBySlug is not supported.');
  }

  // ─── Org-scoped list ─────────────────────────────────────────────────────

  async findByOrganizationId(
    organizationId: string,
    input?: Omit<ListNodesInput, 'projectId'>,
  ): Promise<ListNodesRepositoryResult> {
    let query = this.client
      .from('node')
      .select(NODE_SELECT, { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('is_deleted', false);

    // Search
    if (input?.search) {
      query = query.or(
        `label_name.ilike.%${input.search}%,ip.ilike.%${input.search}%`,
      );
    }

    // Filters
    if (input?.lifecycle?.length) {
      query = query.in(
        'lifecycle',
        input.lifecycle as Enums<'node_lifecycle_state'>[],
      );
    }
    if (input?.eligibility?.length) {
      query = query.in(
        'eligibility',
        input.eligibility as Enums<'node_eligibility_state'>[],
      );
    }
    if (input?.region?.length) {
      query = query.in('region', input.region);
    }
    if (input?.provider?.length) {
      const sqlProviders = input.provider.map(
        (p) => PROVIDER_TO_SQL[p],
      ) as Enums<'hosting_provider'>[];
      query = query.in('hosting_provider', sqlProviders);
    }

    // Sort
    const sortKey = input?.sort?.key ?? 'createdAt';
    const asc = (input?.sort?.direction ?? 'desc') === 'asc';
    const columnMap: Record<string, string> = {
      name: 'label_name',
      lifecycle: 'lifecycle',
      region: 'region',
      kind: 'instance_type',
      cpuCores: 'cpu',
      memoryGb: 'memory',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      lastSeenAt: 'created_at', // fallback — last_seen_at is on runtime state
    };
    query = query.order(columnMap[sortKey] ?? 'created_at', {
      ascending: asc,
    });

    // Cursor pagination (numeric offset)
    const limit = input?.limit ?? 50;
    const offset = input?.cursor ? parseInt(input.cursor, 10) : 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(`Failed to list nodes: ${error.message}`);

    const items = (data ?? []).map((row) => this.deserialize(row as NodeRow));
    const total = count ?? items.length;
    const nextOffset = offset + limit;
    const nextCursor = nextOffset < total ? String(nextOffset) : null;

    // Build facets from unfiltered set
    const facets = await this.buildFacets(organizationId);

    return { items, total, nextCursor, facets };
  }

  private async buildFacets(
    organizationId: string,
  ): Promise<ListNodesRepositoryResult['facets']> {
    const { data } = await this.client
      .from('node')
      .select('lifecycle, region, hosting_provider')
      .eq('organization_id', organizationId)
      .eq('is_deleted', false);

    const lifecycle: Record<string, number> = {};
    const region: Record<string, number> = {};
    const provider: Record<string, number> = {};

    for (const row of data ?? []) {
      if (row.lifecycle) {
        lifecycle[row.lifecycle] = (lifecycle[row.lifecycle] ?? 0) + 1;
      }
      if (row.region) {
        region[row.region] = (region[row.region] ?? 0) + 1;
      }
      if (row.hosting_provider) {
        const d = SQL_PROVIDER_TO_DOMAIN[row.hosting_provider];
        if (d) provider[d] = (provider[d] ?? 0) + 1;
      }
    }

    return { lifecycle, region, provider };
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(entity: Node): Promise<Node> {
    const row = this.serialize(entity);
    const { data, error } = await this.client
      .from('node')
      .insert(row as never)
      .select(NODE_SELECT)
      .single();
    if (error) throw new Error(`Failed to create node: ${error.message}`);
    return this.deserialize(data as NodeRow);
  }

  async update(entity: Node): Promise<Node> {
    const {
      id,
      createdAt: _c,
      updatedAt: _u,
      ...row
    } = this.serialize(entity) as Record<string, unknown> & {
      id: string;
      createdAt?: unknown;
      updatedAt?: unknown;
    };
    const { data, error } = await this.client
      .from('node')
      .update(row as never)
      .eq('id', id)
      .eq('is_deleted', false)
      .select(NODE_SELECT)
      .single();
    if (error) throw new Error(`Failed to update node: ${error.message}`);
    if (!data) throw DomainException.new({ code: Code.NODE_NOT_FOUND_ERROR });
    return this.deserialize(data as NodeRow);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.client
      .from('node')
      .update({ is_deleted: true } as never)
      .eq('id', id);
    if (error) throw new Error(`Failed to delete node: ${error.message}`);
    return true;
  }

  // ─── Bulk delete (soft) ──────────────────────────────────────────────────

  async bulkDelete(ids: string[]): Promise<BulkResult> {
    const { data, error } = await this.client
      .from('node')
      .update({ is_deleted: true } as never)
      .in('id', ids)
      .select('id');

    if (error) {
      return {
        succeeded: [],
        failed: ids.map((id) => ({ id, reason: error.message })),
      };
    }

    const succeeded = (data ?? []).map((r) => r.id as string);
    const succeededSet = new Set(succeeded);
    const failed = ids
      .filter((id) => !succeededSet.has(id))
      .map((id) => ({ id, reason: 'not-found' }));

    return { succeeded, failed };
  }

  // ─── Metrics (Phase 1: not stored in Supabase) ────────────────────────────

  async getMetrics(_id: string, _range: MetricsRange): Promise<MetricsPoint[]> {
    return [];
  }

  // ─── RFC 0026 5-axis state mutations ─────────────────────────────────────

  /**
   * Common version-conflict / not-found path. Reads the row by id (no
   * version filter) and throws the right `DomainException` based on
   * presence + actual version. Caller already proved the
   * `eq('version', expectedVersion)` filter matched zero rows.
   */
  private async raiseUpdateError(
    id: string,
    expectedVersion: number,
  ): Promise<never> {
    const { data: existing } = await this.client
      .from('node')
      .select('id, version')
      .eq('id', id)
      .single();

    if (!existing) {
      throw DomainException.new({
        code: Code.NODE_NOT_FOUND_ERROR,
        overrideMessage: `Node '${id}' not found`,
      });
    }

    throw DomainException.new({
      code: Code.NODE_VERSION_CONFLICT_ERROR,
      overrideMessage: `Node '${id}' version conflict`,
      data: { nodeId: id, expectedVersion, actualVersion: existing.version },
    });
  }

  async setLifecycle(
    id: string,
    lifecycle: NodeLifecycleState,
    expectedVersion: number,
  ): Promise<Node> {
    const { data, error } = await this.client
      .from('node')
      .update({
        lifecycle: lifecycle as Enums<'node_lifecycle_state'>,
      } as never)
      .eq('id', id)
      .eq('version', expectedVersion)
      .eq('is_deleted', false)
      .select(NODE_SELECT)
      .single();

    if (error || !data) return this.raiseUpdateError(id, expectedVersion);
    return this.deserialize(data as NodeRow);
  }

  async setEligibility(
    id: string,
    eligibility: NodeEligibility,
    expectedVersion: number,
  ): Promise<Node> {
    const { data, error } = await this.client
      .from('node')
      .update({
        eligibility: eligibility as Enums<'node_eligibility_state'>,
      } as never)
      .eq('id', id)
      .eq('version', expectedVersion)
      .eq('is_deleted', false)
      .select(NODE_SELECT)
      .single();

    if (error || !data) return this.raiseUpdateError(id, expectedVersion);
    return this.deserialize(data as NodeRow);
  }

  /**
   * Upserts (or deletes when `drain` is `null`) the `node_drain` row
   * for a node. The version check happens against `public.node`; the
   * drain table is a sub-row whose updates fan back to the parent via
   * the `node_drain_resync_legacy_status` AFTER trigger from schema 48.
   *
   * Mirrors Nomad semantics — drain absence ≠ inactive drain. A cleared
   * drain DELETEs the row instead of writing `active=false` so the
   * trigger projection matches `running` again.
   */
  async setDrain(
    id: string,
    drain: NodeDrain | null,
    expectedVersion: number,
  ): Promise<Node> {
    // Version-gate against the parent row first; the cheapest way is a
    // single UPDATE that bumps `updated_at` and matches the version.
    const { data: parent, error: parentError } = await this.client
      .from('node')
      .update({ updated_at: new Date().toISOString() } as never)
      .eq('id', id)
      .eq('version', expectedVersion)
      .eq('is_deleted', false)
      .select('id')
      .single();

    if (parentError || !parent) {
      return this.raiseUpdateError(id, expectedVersion);
    }

    if (drain === null) {
      const { error: delError } = await this.client
        .from('node_drain')
        .delete()
        .eq('node_id', id);
      if (delError) {
        throw new Error(`Failed to clear node_drain: ${delError.message}`);
      }
    } else {
      const row = {
        node_id: id,
        active: drain.active,
        deadline: drain.deadline ?? null,
        ignore_system_jobs: drain.ignoreSystemJobs,
        force: drain.force,
        started_at: drain.startedAt ?? null,
        completed_at: drain.completedAt ?? null,
      };
      const { error: upsertError } = await this.client
        .from('node_drain')
        .upsert(row as never, { onConflict: 'node_id' });
      if (upsertError) {
        throw new Error(`Failed to upsert node_drain: ${upsertError.message}`);
      }
    }

    // Re-read the parent row with full join to return the canonical Node.
    const fresh = await this.findById(id);
    if (!fresh) {
      throw DomainException.new({
        code: Code.NODE_NOT_FOUND_ERROR,
        overrideMessage: `Node '${id}' disappeared after setDrain`,
      });
    }
    return fresh;
  }
}
