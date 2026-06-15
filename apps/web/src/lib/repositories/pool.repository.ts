import type { Pool } from '@qlm/domain/entities';
import { IPoolRepository } from '@qlm/domain/repositories';

import { apiGet } from './api-client';

/**
 * Browser-side HTTP adapter for `/api/pools`.
 *
 * Server (apps/server/src/routes/pools.ts) returns `{ items: Pool[] }`;
 * adapter unwraps to the bare array the domain port expects.
 */
export class PoolRepository extends IPoolRepository {
  async findByOrganizationId(projectId: string): Promise<Pool[]> {
    const qs = new URLSearchParams({ projectId });
    const body = await apiGet<{ items: Pool[] }>(
      `/pools?${qs.toString()}`,
      false,
    );
    return body?.items ?? [];
  }
}
