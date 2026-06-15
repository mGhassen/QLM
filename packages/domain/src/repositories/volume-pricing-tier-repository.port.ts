import type { VolumePricingTier } from '../entities';
import { RepositoryPort } from './base-repository.port';

export abstract class IVolumePricingTierRepository extends RepositoryPort<
  VolumePricingTier,
  string
> {
  public abstract findActiveOrderedByPriority(): Promise<VolumePricingTier[]>;
}
