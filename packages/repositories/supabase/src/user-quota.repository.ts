import type { RepositoryFindOptions } from '@qlm/domain/common';
import type { UserQuota } from '@qlm/domain/entities';
import { IUserQuotaRepository } from '@qlm/domain/repositories';
import type { SupabaseClientType } from './types';

export class UserQuotaRepository extends IUserQuotaRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private deserialize(row: Record<string, unknown>): UserQuota {
    return {
      id: row.id as string,
      organizationId: row.organization_id as string,
      userId: row.user_id as string,
      creditsAllocated: (row.credits_allocated as number) ?? 0,
      creditsUsed: (row.credits_used as number) ?? 0,
      creditsRemaining:
        row.credits_remaining != null ? (row.credits_remaining as number) : 0,
      isActive: (row.is_active as boolean) ?? true,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  async findAll(_options?: RepositoryFindOptions): Promise<UserQuota[]> {
    throw new Error('Unsupported');
  }

  async findById(_id: string): Promise<UserQuota | null> {
    throw new Error('Unsupported');
  }

  async findBySlug(_slug: string): Promise<UserQuota | null> {
    throw new Error('Unsupported');
  }

  async create(_entity: UserQuota): Promise<UserQuota> {
    throw new Error('Unsupported');
  }

  async update(_entity: UserQuota): Promise<UserQuota> {
    throw new Error('Unsupported');
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error('Unsupported');
  }

  async findByOrganizationId(organizationId: string): Promise<UserQuota[]> {
    const { data, error } = await this.client
      .from('user_quotas')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(
        `Failed to fetch user quotas by organization: ${error.message}`,
      );
    }
    return (data ?? []).map((row) => this.deserialize(row));
  }

  async findByUserId(
    organizationId: string,
    userId: string,
  ): Promise<UserQuota | null> {
    const { data, error } = await this.client
      .from('user_quotas')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch user quota: ${error.message}`);
    }
    return data ? this.deserialize(data) : null;
  }
}
