import { describe, expect, it, vi } from 'vitest';

import type { Pool } from '../../../src/entities/pool.type';
import { IPoolRepository } from '../../../src/repositories/pool-repository.port';
import { ListPoolsByProjectService } from '../../../src/services/pool/list-pools-by-project.usecase';

class MockPoolRepository extends IPoolRepository {
  public findByOrganizationId = vi.fn<(orgId: string) => Promise<Pool[]>>();
}

const SAMPLE_POOL: Pool = {
  id: 'aws::us-east-1::default',
  projectId: 'org-1',
  name: 'default',
  provider: 'aws',
  region: 'us-east-1',
  nodeCount: 3,
  totalCpu: 12,
  totalMemoryGb: 48,
  lifecycleCounts: {
    provisioning: 0,
    active: 3,
    stopping: 0,
    stopped: 0,
    terminating: 0,
    terminated: 0,
  },
  healthCounts: {
    healthy: 3,
    degraded: 0,
    critical: 0,
    unknown: 0,
  },
  avgCpuUtilPct: 42,
  avgMemUtilPct: 60,
};

describe('ListPoolsByProjectService', () => {
  it('returns the pools the repository found, wrapped in items', async () => {
    const repo = new MockPoolRepository();
    repo.findByOrganizationId.mockResolvedValue([SAMPLE_POOL]);
    const service = new ListPoolsByProjectService(repo);

    const result = await service.execute({ projectId: 'org-1' });

    expect(repo.findByOrganizationId).toHaveBeenCalledWith('org-1');
    expect(result).toEqual({ items: [SAMPLE_POOL] });
  });

  it('returns an empty list for an org with no pools', async () => {
    const repo = new MockPoolRepository();
    repo.findByOrganizationId.mockResolvedValue([]);
    const service = new ListPoolsByProjectService(repo);

    const result = await service.execute({ projectId: 'org-empty' });

    expect(result).toEqual({ items: [] });
  });
});
