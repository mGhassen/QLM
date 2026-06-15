import type { Database as DatabaseEntity } from '@guepard/domain/entities';
import { IDatabaseRepository } from '@guepard/domain/repositories';
import type { SupabaseClientType } from './types';

type JoinedPerformanceProfile = {
  id: string;
  label_name: string;
  database_provider: string;
  database_version: string;
  min_cpu: number;
  min_memory: number;
  config_flags: unknown;
  is_default: boolean;
  is_active: boolean;
};

type JoinedCompute = {
  id: string;
  label_name: string;
  job_status: string;
  compute_status?: string | null;
  performance_profile?:
    | JoinedPerformanceProfile
    | JoinedPerformanceProfile[]
    | null;
};

type JoinedDbRole = {
  id: string;
  username: string;
  superuser: boolean;
  privileges: unknown;
  status: string;
};

type JoinedDeploymentRow = {
  id: string;
  name: string;
  account_id: string;
  database_provider: string;
  database_version: string;
  status: string | null;
  deployment_type: string | null;
  fqdn: string | null;
  port?: number | null;
  node_id?: string | null;
  db_user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  compute?: JoinedCompute | JoinedCompute[] | null;
  db_role?: JoinedDbRole | JoinedDbRole[] | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map domain status (lowercase) ↔ SQL status (uppercase). */
const STATUS_TO_SQL: Record<string, string> = {
  init: 'INIT',
  pending: 'PENDING',
  in_progress: 'IN_PROGRESS',
  created: 'CREATED',
  error: 'ERROR',
  deleted: 'DELETED',
};

const STATUS_FROM_SQL: Record<string, DatabaseEntity['status']> = {
  INIT: 'init',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  CREATED: 'created',
  ERROR: 'error',
  DELETED: 'deleted',
};

const DEPLOYMENT_TYPE_FROM_SQL: Record<
  string,
  DatabaseEntity['deploymentType']
> = {
  REPOSITORY: 'repository',
  SHADOW: 'shadow',
  F2: 'f2',
};

/**
 * Eagerly joins compute (with performance_profile) and db_role onto
 * deployment_request rows.
 *
 * NOTE: FK alias `compute!compute_deployment_id_fkey` disambiguates the join
 * (compute has both deployment_id→deployment_request and account_id→accounts FKs).
 */
const DATABASE_SELECT = `
  *,
  compute!compute_deployment_id_fkey (
    id, label_name, job_status, compute_status,
    performance_profile (
      id, label_name, database_provider, database_version,
      min_cpu, min_memory, config_flags, is_default, is_active
    )
  ),
  db_role!db_user_id (
    id, username, superuser, privileges, status
  )
` as const;

function deserialize(row: JoinedDeploymentRow): DatabaseEntity {
  const computeRow = Array.isArray(row.compute) ? row.compute[0] : row.compute;
  const ppRow = computeRow?.performance_profile
    ? Array.isArray(computeRow.performance_profile)
      ? computeRow.performance_profile[0]
      : computeRow.performance_profile
    : undefined;
  const dbRoleRow = Array.isArray(row.db_role) ? row.db_role[0] : row.db_role;

  return {
    id: row.id,
    name: row.name,
    accountId: row.account_id,
    provider: row.database_provider,
    version: row.database_version,
    status: STATUS_FROM_SQL[row.status as string] ?? 'init',
    deploymentType:
      DEPLOYMENT_TYPE_FROM_SQL[row.deployment_type as string] ?? 'repository',
    fqdn: row.fqdn ?? '',
    port: row.port ?? undefined,
    nodeId: row.node_id ?? undefined,
    dbUserId: row.db_user_id ?? undefined,
    compute: computeRow
      ? {
          id: computeRow.id,
          labelName: computeRow.label_name,
          jobStatus: computeRow.job_status,
          computeStatus: computeRow.compute_status ?? undefined,
          performanceProfile: ppRow
            ? {
                id: ppRow.id,
                labelName: ppRow.label_name,
                databaseProvider: ppRow.database_provider,
                databaseVersion: ppRow.database_version,
                minCpu: ppRow.min_cpu,
                minMemory: ppRow.min_memory,
                configFlags: ppRow.config_flags as
                  | Record<string, unknown>
                  | undefined,
                isDefault: ppRow.is_default,
                isActive: ppRow.is_active,
                isSeed: false,
                accountId: null,
                createdAt: '',
                updatedAt: '',
              }
            : undefined,
        }
      : undefined,
    dbRole: dbRoleRow
      ? {
          id: dbRoleRow.id,
          username: dbRoleRow.username,
          superuser: dbRoleRow.superuser,
          privileges: (dbRoleRow.privileges as unknown[]) ?? [],
          status:
            (dbRoleRow.status as DatabaseEntity['dbRole'] extends infer R
              ? R extends { status: infer S }
                ? S
                : never
              : never) ?? 'init',
        }
      : undefined,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

// ─── Repository ──────────────────────────────────────────────────────────────

export class DatabaseRepository extends IDatabaseRepository {
  constructor(private readonly client: SupabaseClientType) {
    super();
  }

  public async findAll(): Promise<DatabaseEntity[]> {
    const { data, error } = await this.client
      .from('deployment_request')
      .select(DATABASE_SELECT)
      .neq('status', 'DELETED')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(deserialize);
  }

  public async findByAccountId(accountId: string): Promise<DatabaseEntity[]> {
    const { data, error } = await this.client
      .from('deployment_request')
      .select(DATABASE_SELECT)
      .eq('account_id', accountId)
      .neq('status', 'DELETED')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(deserialize);
  }

  public async findById(id: string): Promise<DatabaseEntity | null> {
    const { data, error } = await this.client
      .from('deployment_request')
      .select(DATABASE_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data ? deserialize(data) : null;
  }

  public async create(entity: DatabaseEntity): Promise<DatabaseEntity> {
    const { data, error } = await this.client
      .from('deployment_request')
      .insert({
        id: entity.id,
        name: entity.name,
        account_id: entity.accountId,
        database_provider: entity.provider,
        database_version: entity.version,
        status: STATUS_TO_SQL[entity.status] ?? 'INIT',
        deployment_type: entity.deploymentType.toUpperCase(),
        fqdn: entity.fqdn,
        port: entity.port ?? null,
        node_id: entity.nodeId ?? null,
        db_user_id: entity.dbUserId ?? null,
        // required non-nullable fields with defaults
        repository_name: entity.name,
      })
      .select(DATABASE_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return deserialize(data);
  }

  public async update(entity: DatabaseEntity): Promise<DatabaseEntity> {
    const { data, error } = await this.client
      .from('deployment_request')
      .update({
        status: STATUS_TO_SQL[entity.status] ?? entity.status.toUpperCase(),
        node_id: entity.nodeId ?? null,
        port: entity.port ?? null,
      })
      .eq('id', entity.id)
      .select(DATABASE_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return deserialize(data);
  }

  public async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('deployment_request')
      .update({ status: 'DELETED' })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
}
