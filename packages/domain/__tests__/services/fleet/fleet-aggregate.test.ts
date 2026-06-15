import { describe, expect, it, vi } from 'vitest';

import type { Node, Pool } from '../../../src/entities';
import { INodeRepository } from '../../../src/repositories/node-repository.port';
import { IPoolRepository } from '../../../src/repositories/pool-repository.port';
import { FleetAggregateService } from '../../../src/services/fleet/fleet-aggregate.usecase';
import {
  HIGH_CPU_PCT,
  HIGH_MEM_PCT,
} from '../../../src/usecases/fleet/pressure-point.dto';

class MockNodeRepository extends INodeRepository {
  public findByOrganizationId = vi.fn();
  public findAll = vi.fn();
  public findById = vi.fn();
  public findBySlug = vi.fn();
  public create = vi.fn();
  public update = vi.fn();
  public delete = vi.fn();
  public bulkDelete = vi.fn();
  public getMetrics = vi.fn();
  public setLifecycle = vi.fn();
  public setEligibility = vi.fn();
  public setDrain = vi.fn();
}

class MockPoolRepository extends IPoolRepository {
  public findByOrganizationId = vi.fn<(id: string) => Promise<Pool[]>>();
}

function makeNode(overrides: Partial<Node> = {}): Node {
  return {
    id: overrides.id ?? 'n-1',
    projectId: 'org-1',
    name: overrides.name ?? 'web-1',
    kind: 'standard-2',
    region: 'us-east-1',
    cpuCores: 4,
    memoryGb: 16,
    tags: [],
    version: 1,
    lifecycle: 'active',
    orchestration: 'ready',
    eligibility: 'eligible',
    health: 'healthy',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('FleetAggregateService', () => {
  describe('summary', () => {
    it('counts totals, lifecycle/health axes, and structure across the fleet', async () => {
      const nodes = new MockNodeRepository();
      const pools = new MockPoolRepository();
      nodes.findByOrganizationId.mockResolvedValue({
        items: [
          makeNode({
            id: 'a',
            provider: 'aws',
            region: 'us-east-1',
            cluster: 'default',
            cpuUtilPct: 50,
            memUtilPct: 60,
          }),
          makeNode({
            id: 'b',
            provider: 'aws',
            region: 'us-east-1',
            cluster: 'default',
            cpuUtilPct: 70,
            memUtilPct: 80,
            health: 'degraded',
          }),
          makeNode({
            id: 'c',
            provider: 'gcp',
            region: 'us-west-2',
            cluster: 'gpu',
            lifecycle: 'stopped',
            orchestration: 'down',
            health: 'unknown',
          }),
          makeNode({
            id: 'd',
            provider: 'aws',
            region: 'us-east-1',
            orchestration: 'down',
            health: 'critical',
          }),
        ],
        total: 4,
        nextCursor: null,
        facets: { lifecycle: [], region: [], provider: [] },
      });

      const service = new FleetAggregateService(nodes, pools);
      const summary = await service.summary('org-1');

      expect(summary.total).toBe(4);
      expect(summary.totalCpu).toBe(16);
      expect(summary.totalMem).toBe(64);
      expect(summary.lifecycleCounts).toEqual({
        provisioning: 0,
        active: 3,
        stopping: 0,
        stopped: 1,
        terminating: 0,
        terminated: 0,
      });
      expect(summary.healthCounts).toEqual({
        healthy: 1,
        degraded: 1,
        critical: 1,
        unknown: 1,
      });
      expect(summary.regions).toBe(2);
      expect(summary.clusters).toBe(2);
      expect(summary.providers).toBe(2);
      expect(summary.avgCpuUtil).toBe(60);
      expect(summary.avgMemUtil).toBe(70);
    });

    it('returns undefined utilization when no node reports metrics', async () => {
      const nodes = new MockNodeRepository();
      const pools = new MockPoolRepository();
      nodes.findByOrganizationId.mockResolvedValue({
        items: [makeNode({ id: 'a' })],
        total: 1,
        nextCursor: null,
        facets: { lifecycle: [], region: [], provider: [] },
      });

      const service = new FleetAggregateService(nodes, pools);
      const summary = await service.summary('org-1');

      expect(summary.avgCpuUtil).toBeUndefined();
      expect(summary.avgMemUtil).toBeUndefined();
    });
  });

  describe('listPools', () => {
    it('delegates to the pool repository', async () => {
      const nodes = new MockNodeRepository();
      const pools = new MockPoolRepository();
      const samplePool: Pool = {
        id: 'aws::us-east-1::default',
        projectId: 'org-1',
        name: 'default',
        provider: 'aws',
        region: 'us-east-1',
        nodeCount: 2,
        totalCpu: 8,
        totalMemoryGb: 32,
        lifecycleCounts: {
          provisioning: 0,
          active: 2,
          stopping: 0,
          stopped: 0,
          terminating: 0,
          terminated: 0,
        },
        healthCounts: {
          healthy: 2,
          degraded: 0,
          critical: 0,
          unknown: 0,
        },
      };
      pools.findByOrganizationId.mockResolvedValue([samplePool]);

      const service = new FleetAggregateService(nodes, pools);
      const result = await service.listPools('org-1');

      expect(pools.findByOrganizationId).toHaveBeenCalledWith('org-1');
      expect(result).toEqual([samplePool]);
    });
  });

  describe('pressurePoints', () => {
    it('flags unreachable nodes (orchestration=down|disconnected)', async () => {
      const nodes = new MockNodeRepository();
      const pools = new MockPoolRepository();
      nodes.findByOrganizationId.mockResolvedValue({
        items: [
          makeNode({ id: 'ok' }),
          makeNode({ id: 'gone', orchestration: 'down' }),
          makeNode({ id: 'split', orchestration: 'disconnected' }),
        ],
        total: 3,
        nextCursor: null,
        facets: { lifecycle: [], region: [], provider: [] },
      });

      const service = new FleetAggregateService(nodes, pools);
      const points = await service.pressurePoints('org-1');

      expect(points).toHaveLength(2);
      expect(points.every((p) => p.kind === 'unreachable')).toBe(true);
    });

    it('flags failing nodes (health=critical) when orchestration is up', async () => {
      const nodes = new MockNodeRepository();
      const pools = new MockPoolRepository();
      nodes.findByOrganizationId.mockResolvedValue({
        items: [
          makeNode({ id: 'ok' }),
          makeNode({ id: 'sick', health: 'critical' }),
        ],
        total: 2,
        nextCursor: null,
        facets: { lifecycle: [], region: [], provider: [] },
      });

      const service = new FleetAggregateService(nodes, pools);
      const points = await service.pressurePoints('org-1');

      expect(points).toHaveLength(1);
      expect(points[0]?.kind).toBe('failing');
      expect(points[0]?.nodeId).toBe('sick');
    });

    it('flags high CPU and memory above the 85% threshold', async () => {
      const nodes = new MockNodeRepository();
      const pools = new MockPoolRepository();
      nodes.findByOrganizationId.mockResolvedValue({
        items: [
          makeNode({ id: 'cool', cpuUtilPct: 50, memUtilPct: 50 }),
          makeNode({
            id: 'hot-cpu',
            cpuUtilPct: HIGH_CPU_PCT + 5,
            memUtilPct: 30,
          }),
          makeNode({
            id: 'hot-mem',
            cpuUtilPct: 30,
            memUtilPct: HIGH_MEM_PCT + 10,
          }),
        ],
        total: 3,
        nextCursor: null,
        facets: { lifecycle: [], region: [], provider: [] },
      });

      const service = new FleetAggregateService(nodes, pools);
      const points = await service.pressurePoints('org-1');

      expect(points.find((p) => p.kind === 'highCpu')).toMatchObject({
        nodeId: 'hot-cpu',
        value: HIGH_CPU_PCT + 5,
      });
      expect(points.find((p) => p.kind === 'highMem')).toMatchObject({
        nodeId: 'hot-mem',
        value: HIGH_MEM_PCT + 10,
      });
    });

    it('does not double-flag a single node under 85%', async () => {
      const nodes = new MockNodeRepository();
      const pools = new MockPoolRepository();
      nodes.findByOrganizationId.mockResolvedValue({
        items: [
          makeNode({
            id: 'edge',
            cpuUtilPct: HIGH_CPU_PCT - 1,
            memUtilPct: HIGH_MEM_PCT - 1,
          }),
        ],
        total: 1,
        nextCursor: null,
        facets: { lifecycle: [], region: [], provider: [] },
      });

      const service = new FleetAggregateService(nodes, pools);
      expect(await service.pressurePoints('org-1')).toEqual([]);
    });

    it('puts presence-marker kinds (unreachable / failing) ahead of util-based pressures', async () => {
      const nodes = new MockNodeRepository();
      const pools = new MockPoolRepository();
      nodes.findByOrganizationId.mockResolvedValue({
        items: [
          makeNode({ id: 'hot', cpuUtilPct: 99 }),
          makeNode({ id: 'gone', orchestration: 'down' }),
        ],
        total: 2,
        nextCursor: null,
        facets: { lifecycle: [], region: [], provider: [] },
      });

      const service = new FleetAggregateService(nodes, pools);
      const points = await service.pressurePoints('org-1');

      expect(points[0]?.kind).toBe('unreachable');
      expect(points[1]?.kind).toBe('highCpu');
    });
  });
});
