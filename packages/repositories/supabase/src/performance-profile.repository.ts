import type { PerformanceProfile } from '@guepard/domain/entities';
import { IPerformanceProfileRepository } from '@guepard/domain/repositories';
import type { Tables } from '@guepard/supabase/database';
import type { SupabaseClientType } from './types';

const PROFILE_SELECT = `
  id, label_name, description_text, database_provider, database_version,
  min_cpu, min_memory, config_flags, is_default, is_active, is_seed,
  account_id, created_at, updated_at
` as const;

type PerformanceProfileRow = Pick<
  Tables<'performance_profile'>,
  | 'id'
  | 'label_name'
  | 'description_text'
  | 'database_provider'
  | 'database_version'
  | 'min_cpu'
  | 'min_memory'
  | 'config_flags'
  | 'is_default'
  | 'is_active'
  | 'is_seed'
  | 'account_id'
  | 'created_at'
  | 'updated_at'
>;

function deserialize(row: PerformanceProfileRow): PerformanceProfile {
  return {
    id: row.id,
    labelName: row.label_name,
    descriptionText: row.description_text ?? undefined,
    databaseProvider: row.database_provider,
    databaseVersion: row.database_version,
    minCpu: row.min_cpu,
    minMemory: row.min_memory,
    configFlags: row.config_flags as Record<string, unknown> | undefined,
    isDefault: row.is_default,
    isActive: row.is_active,
    isSeed: row.is_seed ?? false,
    accountId: row.account_id ?? null,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

export class PerformanceProfileRepository extends IPerformanceProfileRepository {
  constructor(private readonly client: SupabaseClientType) {
    super();
  }

  public async findPublicCatalog(): Promise<PerformanceProfile[]> {
    const { data, error } = await this.client
      .from('performance_profile')
      .select(PROFILE_SELECT)
      .is('account_id', null)
      .eq('is_active', true)
      .order('label_name', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(deserialize);
  }

  public async findByAccountId(
    accountId: string,
  ): Promise<PerformanceProfile[]> {
    const { data, error } = await this.client
      .from('performance_profile')
      .select(PROFILE_SELECT)
      .or(`account_id.eq.${accountId},account_id.is.null`)
      .eq('is_active', true)
      .order('label_name', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(deserialize);
  }

  public async findById(id: string): Promise<PerformanceProfile | null> {
    const { data, error } = await this.client
      .from('performance_profile')
      .select(PROFILE_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data ? deserialize(data) : null;
  }
}
