import type { PerformanceProfile } from '@qlm/domain/entities';
import { IPerformanceProfileRepository } from '@qlm/domain/repositories';

import { apiGet } from './api-client';

export class PerformanceProfileHttpRepository extends IPerformanceProfileRepository {
  async findPublicCatalog(): Promise<PerformanceProfile[]> {
    const data = await apiGet<PerformanceProfile[]>(
      '/performance-profiles',
      false,
    );
    return data ?? [];
  }

  async findByAccountId(accountId: string): Promise<PerformanceProfile[]> {
    const qs = new URLSearchParams({ accountId });
    const data = await apiGet<PerformanceProfile[]>(
      `/performance-profiles?${qs.toString()}`,
      false,
    );
    return data ?? [];
  }

  async findById(id: string): Promise<PerformanceProfile | null> {
    return apiGet<PerformanceProfile>(
      `/performance-profiles/${encodeURIComponent(id)}`,
      true,
    );
  }
}
