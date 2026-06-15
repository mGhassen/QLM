import { describe, expect, it } from 'vitest';

import type { MetricsPoint, MetricsRange, Node } from '../../../src/entities';
import { INodeRepository } from '../../../src/repositories/node-repository.port';
import { BulkDeleteNodesService } from '../../../src/services/node/bulk-delete-nodes.usecase';
import { CreateNodeService } from '../../../src/services/node/create-node.usecase';
import { DeleteNodeService } from '../../../src/services/node/delete-node.usecase';
import { GetNodeService } from '../../../src/services/node/get-node.usecase';
import { ListNodesByProjectService } from '../../../src/services/node/list-nodes-by-project.usecase';
import { UpdateNodeService } from '../../../src/services/node/update-node.usecase';
import type {
  BulkResult,
  ListNodesInput,
  ListNodesRepositoryResult,
} from '../../../src/usecases/dto';

class MockNodeRepository extends INodeRepository {
  private nodes = new Map<string, Node>();

  async findAll() {
    return Array.from(this.nodes.values());
  }

  async findById(id: string) {
    return this.nodes.get(id) ?? null;
  }

  async findBySlug() {
    return null;
  }

  async findByOrganizationId(
    projectId: string,
    _input?: Omit<ListNodesInput, 'projectId'>,
  ): Promise<ListNodesRepositoryResult> {
    const items = Array.from(this.nodes.values()).filter(
      (n) => n.projectId === projectId,
    );
    return {
      items,
      total: items.length,
      nextCursor: null,
      facets: { lifecycle: {}, region: {}, provider: {} },
    };
  }

  async create(entity: Node) {
    this.nodes.set(entity.id, entity);
    return entity;
  }

  async update(entity: Node) {
    if (!this.nodes.has(entity.id)) {
      throw new Error(`Node ${entity.id} not found`);
    }
    this.nodes.set(entity.id, entity);
    return entity;
  }

  async delete(id: string) {
    return this.nodes.delete(id);
  }

  async bulkDelete(ids: string[]): Promise<BulkResult> {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of ids) {
      if (this.nodes.delete(id)) succeeded.push(id);
      else failed.push({ id, reason: 'not-found' });
    }
    return { succeeded, failed };
  }

  async getMetrics(_id: string, _range: MetricsRange): Promise<MetricsPoint[]> {
    return [];
  }

  async setLifecycle(id: string, lifecycle: Node['lifecycle']) {
    const existing = this.nodes.get(id);
    if (!existing) throw new Error(`Node ${id} not found`);
    const next: Node = {
      ...existing,
      lifecycle,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.nodes.set(id, next);
    return next;
  }

  async setEligibility(id: string, eligibility: Node['eligibility']) {
    const existing = this.nodes.get(id);
    if (!existing) throw new Error(`Node ${id} not found`);
    const next: Node = {
      ...existing,
      eligibility,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.nodes.set(id, next);
    return next;
  }

  async setDrain(id: string, drain: Node['drain'] | null) {
    const existing = this.nodes.get(id);
    if (!existing) throw new Error(`Node ${id} not found`);
    const next: Node = {
      ...existing,
      drain: drain ?? undefined,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.nodes.set(id, next);
    return next;
  }
}

function newRepo() {
  return new MockNodeRepository();
}

describe('CreateNodeService', () => {
  it('creates a node and persists it', async () => {
    const repo = newRepo();
    const result = await new CreateNodeService(repo).execute({
      projectId: 'p_1',
      name: 'web-1',
      kind: 'standard-4',
      region: 'us-east-1',
      cpuCores: 4,
      memoryGb: 16,
    });
    expect(result.version).toBe(1);
    expect(result.lifecycle).toBe('provisioning');
    expect(result.eligibility).toBe('eligible');
    const saved = await repo.findById(result.id);
    expect(saved).not.toBeNull();
  });
});

describe('GetNodeService', () => {
  it('returns the node', async () => {
    const repo = newRepo();
    const created = await new CreateNodeService(repo).execute({
      projectId: 'p_1',
      name: 'web-1',
      kind: 'standard-4',
      region: 'us-east-1',
      cpuCores: 4,
      memoryGb: 16,
    });
    const found = await new GetNodeService(repo).execute(created.id);
    expect(found.id).toBe(created.id);
  });

  it('throws when not found', async () => {
    await expect(
      new GetNodeService(newRepo()).execute('missing'),
    ).rejects.toThrow();
  });
});

describe('UpdateNodeService', () => {
  it('updates an existing node and bumps version', async () => {
    const repo = newRepo();
    const created = await new CreateNodeService(repo).execute({
      projectId: 'p_1',
      name: 'web-1',
      kind: 'standard-4',
      region: 'us-east-1',
      cpuCores: 4,
      memoryGb: 16,
    });
    const updated = await new UpdateNodeService(repo).execute({
      id: created.id,
      name: 'web-renamed',
    });
    expect(updated.name).toBe('web-renamed');
    expect(updated.version).toBe(2);
  });

  it('throws when node does not exist', async () => {
    await expect(
      new UpdateNodeService(newRepo()).execute({ id: 'missing', name: 'x' }),
    ).rejects.toThrow();
  });
});

describe('DeleteNodeService', () => {
  it('deletes an existing node', async () => {
    const repo = newRepo();
    const created = await new CreateNodeService(repo).execute({
      projectId: 'p_1',
      name: 'web-1',
      kind: 'standard-4',
      region: 'us-east-1',
      cpuCores: 4,
      memoryGb: 16,
    });
    const ok = await new DeleteNodeService(repo).execute(created.id);
    expect(ok).toBe(true);
    expect(await repo.findById(created.id)).toBeNull();
  });

  it('throws DomainException on missing (matches DeleteNotebookService)', async () => {
    await expect(
      new DeleteNodeService(newRepo()).execute('missing'),
    ).rejects.toThrow();
  });
});

describe('BulkDeleteNodesService', () => {
  it('returns empty result for empty input without hitting repo', async () => {
    const repo = newRepo();
    const result = await new BulkDeleteNodesService(repo).execute({ ids: [] });
    expect(result).toEqual({ succeeded: [], failed: [] });
  });

  it('reports per-item success/failure', async () => {
    const repo = newRepo();
    const created = await new CreateNodeService(repo).execute({
      projectId: 'p_1',
      name: 'web-1',
      kind: 'standard-4',
      region: 'us-east-1',
      cpuCores: 4,
      memoryGb: 16,
    });
    const result = await new BulkDeleteNodesService(repo).execute({
      ids: [created.id, 'missing'],
    });
    expect(result.succeeded).toEqual([created.id]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.id).toBe('missing');
  });
});

describe('ListNodesByProjectService', () => {
  it('returns project nodes in envelope shape', async () => {
    const repo = newRepo();
    await new CreateNodeService(repo).execute({
      projectId: 'p_1',
      name: 'web-1',
      kind: 'standard-4',
      region: 'us-east-1',
      cpuCores: 4,
      memoryGb: 16,
    });
    await new CreateNodeService(repo).execute({
      projectId: 'p_2',
      name: 'web-2',
      kind: 'standard-4',
      region: 'us-east-1',
      cpuCores: 4,
      memoryGb: 16,
    });
    const result = await new ListNodesByProjectService(repo).execute({
      projectId: 'p_1',
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.nextCursor).toBeNull();
    expect(result.facets).toBeDefined();
  });
});
