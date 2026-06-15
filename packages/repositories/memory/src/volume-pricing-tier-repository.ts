import type { RepositoryFindOptions } from '@guepard/domain/common';
import type { VolumePricingTier } from '@guepard/domain/entities';
import { IVolumePricingTierRepository } from '@guepard/domain/repositories';

export class VolumePricingTierRepository extends IVolumePricingTierRepository {
  async findAll(
    _options?: RepositoryFindOptions,
  ): Promise<VolumePricingTier[]> {
    return [];
  }

  async findById(_id: string): Promise<VolumePricingTier | null> {
    return null;
  }

  async findBySlug(_slug: string): Promise<VolumePricingTier | null> {
    return null;
  }

  async create(_entity: VolumePricingTier): Promise<VolumePricingTier> {
    throw new Error(
      'Volume pricing tiers cannot be created in memory repository (server-side only)',
    );
  }

  async update(_entity: VolumePricingTier): Promise<VolumePricingTier> {
    throw new Error(
      'Volume pricing tiers cannot be updated in memory repository (server-side only)',
    );
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error(
      'Volume pricing tiers cannot be deleted in memory repository (server-side only)',
    );
  }

  async findActiveOrderedByPriority(): Promise<VolumePricingTier[]> {
    return [];
  }
}
