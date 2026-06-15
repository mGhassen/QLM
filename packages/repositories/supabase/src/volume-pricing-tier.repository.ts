import type { VolumePricingTier } from '@guepard/domain/entities';
import { IVolumePricingTierRepository } from '@guepard/domain/repositories';
import type { SupabaseClientType } from './types';
import { RepositoryFindOptions } from '@guepard/domain/common';

export class VolumePricingTierRepository extends IVolumePricingTierRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private deserialize(row: Record<string, unknown>): VolumePricingTier {
    return {
      id: row.id as string,
      minAmountCents: (row.min_amount_cents as number) ?? 0,
      maxAmountCents:
        row.max_amount_cents != null ? (row.max_amount_cents as number) : null,
      creditsMultiplier: Number(row.credits_multiplier) || 1,
      tierName: row.tier_name != null ? (row.tier_name as string) : null,
      description: row.description != null ? (row.description as string) : null,
      isActive: (row.is_active as boolean) ?? true,
      priority: (row.priority as number) ?? 0,
      createdAt: new Date(row.created_at as string),
    };
  }

  async findAll(
    _options?: RepositoryFindOptions,
  ): Promise<VolumePricingTier[]> {
    throw new Error('Unsupported');
  }

  async findById(_id: string): Promise<VolumePricingTier | null> {
    throw new Error('Unsupported');
  }

  async findBySlug(_slug: string): Promise<VolumePricingTier | null> {
    throw new Error('Unsupported');
  }

  async create(_entity: VolumePricingTier): Promise<VolumePricingTier> {
    throw new Error('Unsupported');
  }

  async update(_entity: VolumePricingTier): Promise<VolumePricingTier> {
    throw new Error('Unsupported');
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error('Unsupported');
  }

  async findActiveOrderedByPriority(): Promise<VolumePricingTier[]> {
    const { data, error } = await this.client
      .from('volume_pricing_tiers')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch volume pricing tiers: ${error.message}`);
    }
    return (data ?? []).map((row) => this.deserialize(row));
  }
}
