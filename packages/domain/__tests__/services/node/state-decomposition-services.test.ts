import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Node,
  NodeDrain,
  NodeEligibility,
  NodeLifecycleState,
} from '../../../src/entities';
import { INodeRepository } from '../../../src/repositories/node-repository.port';
import { DrainCancelNodeService } from '../../../src/services/node/drain-cancel-node.usecase';
import { DrainNodeService } from '../../../src/services/node/drain-node.usecase';
import { SetNodeEligibilityService } from '../../../src/services/node/set-eligibility.usecase';
import { SetNodeLifecycleService } from '../../../src/services/node/set-lifecycle.usecase';

function makeNode(overrides: Partial<Node> = {}): Node {
  return {
    id: overrides.id ?? 'node-1',
    projectId: 'org-1',
    name: 'web-1',
    kind: 'standard-2',
    region: 'us-east-1',
    status: 'running',
    cpuCores: 4,
    memoryGb: 16,
    tags: [],
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    lifecycle: 'active',
    orchestration: 'ready',
    eligibility: 'eligible',
    ...overrides,
  };
}

class MockNodeRepository extends INodeRepository {
  public findAll = vi.fn();
  public findById = vi.fn<(id: string) => Promise<Node | null>>();
  public findBySlug = vi.fn();
  public findByOrganizationId = vi.fn();
  public create = vi.fn();
  public update = vi.fn();
  public delete = vi.fn();
  public bulkDelete = vi.fn();
  public getMetrics = vi.fn();
  public setLifecycle =
    vi.fn<(id: string, l: NodeLifecycleState, v: number) => Promise<Node>>();
  public setEligibility =
    vi.fn<(id: string, e: NodeEligibility, v: number) => Promise<Node>>();
  public setDrain =
    vi.fn<(id: string, d: NodeDrain | null, v: number) => Promise<Node>>();
}

let repo: MockNodeRepository;

beforeEach(() => {
  repo = new MockNodeRepository();
});

describe('DrainNodeService', () => {
  it('starts a drain and flips eligibility by default', async () => {
    const node = makeNode({ version: 3 });
    repo.findById.mockResolvedValue(node);
    repo.setDrain.mockResolvedValue({ ...node, version: 4 });
    repo.setEligibility.mockResolvedValue({
      ...node,
      version: 5,
      eligibility: 'ineligible',
    });

    const result = await new DrainNodeService(repo).execute({
      id: node.id,
      deadline: '2026-01-01T01:00:00Z',
      expectedVersion: 3,
    });

    expect(repo.setDrain).toHaveBeenCalledWith(
      node.id,
      expect.objectContaining({
        active: true,
        deadline: '2026-01-01T01:00:00Z',
        ignoreSystemJobs: false,
        force: false,
      }),
      3,
    );
    expect(repo.setEligibility).toHaveBeenCalledWith(node.id, 'ineligible', 4);
    expect(result.eligibility).toBe('ineligible');
  });

  it('does not flip eligibility when setIneligibleOnStart=false', async () => {
    const node = makeNode({ version: 7 });
    repo.findById.mockResolvedValue(node);
    repo.setDrain.mockResolvedValue({ ...node, version: 8 });

    await new DrainNodeService(repo).execute({
      id: node.id,
      expectedVersion: 7,
      setIneligibleOnStart: false,
    });

    expect(repo.setDrain).toHaveBeenCalledOnce();
    expect(repo.setEligibility).not.toHaveBeenCalled();
  });

  it('throws NODE_NOT_FOUND_ERROR when the node is missing', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(
      new DrainNodeService(repo).execute({
        id: 'ghost',
        expectedVersion: 1,
      }),
    ).rejects.toThrow(/not found/i);
  });

  it('throws NODE_VERSION_CONFLICT_ERROR on optimistic-concurrency mismatch', async () => {
    const node = makeNode({ version: 9 });
    repo.findById.mockResolvedValue(node);
    await expect(
      new DrainNodeService(repo).execute({
        id: node.id,
        expectedVersion: 3,
      }),
    ).rejects.toThrow(/version mismatch/i);
  });
});

describe('DrainCancelNodeService', () => {
  it('clears the drain and keeps the node ineligible by default', async () => {
    const node = makeNode({ version: 12, eligibility: 'ineligible' });
    repo.findById.mockResolvedValue(node);
    repo.setDrain.mockResolvedValue({ ...node, version: 13 });

    await new DrainCancelNodeService(repo).execute({
      id: node.id,
      expectedVersion: 12,
    });

    expect(repo.setDrain).toHaveBeenCalledWith(node.id, null, 12);
    expect(repo.setEligibility).not.toHaveBeenCalled();
  });

  it('flips eligibility back to eligible when keepIneligible=false', async () => {
    const node = makeNode({ version: 12, eligibility: 'ineligible' });
    repo.findById.mockResolvedValue(node);
    repo.setDrain.mockResolvedValue({ ...node, version: 13 });
    repo.setEligibility.mockResolvedValue({
      ...node,
      version: 14,
      eligibility: 'eligible',
    });

    const result = await new DrainCancelNodeService(repo).execute({
      id: node.id,
      expectedVersion: 12,
      keepIneligible: false,
    });

    expect(repo.setEligibility).toHaveBeenCalledWith(node.id, 'eligible', 13);
    expect(result.eligibility).toBe('eligible');
  });
});

describe('SetNodeEligibilityService', () => {
  it('writes the new eligibility', async () => {
    const node = makeNode({ version: 4 });
    repo.findById.mockResolvedValue(node);
    repo.setEligibility.mockResolvedValue({
      ...node,
      version: 5,
      eligibility: 'ineligible',
    });

    const result = await new SetNodeEligibilityService(repo).execute({
      id: node.id,
      eligibility: 'ineligible',
      expectedVersion: 4,
    });

    expect(repo.setEligibility).toHaveBeenCalledWith(node.id, 'ineligible', 4);
    expect(result.eligibility).toBe('ineligible');
  });
});

describe('SetNodeLifecycleService', () => {
  it('writes the new lifecycle phase', async () => {
    const node = makeNode({ version: 6 });
    repo.findById.mockResolvedValue(node);
    repo.setLifecycle.mockResolvedValue({
      ...node,
      version: 7,
      lifecycle: 'stopping',
    });

    const result = await new SetNodeLifecycleService(repo).execute({
      id: node.id,
      lifecycle: 'stopping',
      expectedVersion: 6,
    });

    expect(repo.setLifecycle).toHaveBeenCalledWith(node.id, 'stopping', 6);
    expect(result.lifecycle).toBe('stopping');
  });

  it('rejects optimistic-concurrency conflicts', async () => {
    const node = makeNode({ version: 6 });
    repo.findById.mockResolvedValue(node);
    await expect(
      new SetNodeLifecycleService(repo).execute({
        id: node.id,
        lifecycle: 'terminating',
        expectedVersion: 1,
      }),
    ).rejects.toThrow(/version mismatch/i);
  });
});
