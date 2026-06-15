import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import type { Repositories } from '@qlm/domain/repositories';

import { createPoolsRoutes } from '../src/routes/pools';

function makeApp(repositories: Partial<Repositories>) {
  const app = new Hono();
  const router = createPoolsRoutes(async () => repositories as Repositories);
  app.route('/api/pools', router);
  return app;
}

describe('GET /api/pools', () => {
  it('returns pools for the requested project (resolved to its org)', async () => {
    const project = { id: 'p1', organizationId: 'org-1' };
    const sample = [
      {
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
      },
    ];
    const findByOrg = vi.fn().mockResolvedValue(sample);
    const app = makeApp({
      project: { findById: vi.fn().mockResolvedValue(project) } as never,
      pool: { findByOrganizationId: findByOrg } as never,
    });

    const res = await app.request('http://localhost/api/pools?projectId=p1');
    expect(res.status).toBe(200);
    expect(findByOrg).toHaveBeenCalledWith('org-1');
    const body = (await res.json()) as { items: typeof sample };
    expect(body.items).toEqual(sample);
  });

  it('returns 400 when projectId is missing', async () => {
    const app = makeApp({});
    const res = await app.request('http://localhost/api/pools');
    expect(res.status).toBe(400);
  });

  it('returns 404 when the project is not found', async () => {
    const app = makeApp({
      project: { findById: vi.fn().mockResolvedValue(null) } as never,
    });
    const res = await app.request(
      'http://localhost/api/pools?projectId=missing',
    );
    expect(res.status).toBe(404);
  });

  it('returns an empty list for an org with no pools', async () => {
    const app = makeApp({
      project: {
        findById: vi.fn().mockResolvedValue({
          id: 'p2',
          organizationId: 'org-empty',
        }),
      } as never,
      pool: { findByOrganizationId: vi.fn().mockResolvedValue([]) } as never,
    });
    const res = await app.request('http://localhost/api/pools?projectId=p2');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items).toEqual([]);
  });
});
