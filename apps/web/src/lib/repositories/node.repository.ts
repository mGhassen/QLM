import { RepositoryFindOptions } from '@qlm/domain/common';
import type {
  MetricsPoint,
  MetricsRange,
  Node,
  NodeDrain,
  NodeEligibility,
  NodeLifecycleState,
} from '@qlm/domain/entities';
import { INodeRepository } from '@qlm/domain/repositories';
import type {
  BulkResult,
  ListNodesInput,
  ListNodesRepositoryResult,
} from '@qlm/domain/usecases';

import { apiDelete, apiGet, apiPatch, apiPost } from './api-client';

/**
 * Browser-side HTTP adapter for `/api/nodes`.
 *
 * `findByProjectId` tolerates both the legacy `Node[]` response (Phase 2
 * MSW) and the envelope shape `{ items, total, nextCursor, facets }`
 * introduced in Phase 3 — adapter normalizes to the envelope so the shell
 * resource + presentation always see a stable shape.
 */
export class NodeRepository extends INodeRepository {
  async findAll(_options?: RepositoryFindOptions): Promise<Node[]> {
    throw new Error(
      'NodeRepository.findAll is not supported — use findByProjectId.',
    );
  }

  async findById(id: string): Promise<Node | null> {
    return apiGet<Node>(`/nodes/${encodeURIComponent(id)}`, true);
  }

  async findBySlug(_slug: string): Promise<Node | null> {
    throw new Error('NodeRepository.findBySlug is not supported.');
  }

  async findByOrganizationId(
    projectId: string,
    input?: Omit<ListNodesInput, 'projectId'>,
  ): Promise<ListNodesRepositoryResult> {
    const qs = new URLSearchParams({ projectId });
    if (input?.cursor) qs.set('cursor', input.cursor);
    if (input?.limit != null) qs.set('limit', String(input.limit));
    if (input?.search) qs.set('search', input.search);
    for (const s of input?.lifecycle ?? []) qs.append('lifecycle', s);
    for (const e of input?.eligibility ?? []) qs.append('eligibility', e);
    for (const r of input?.region ?? []) qs.append('region', r);
    for (const p of input?.provider ?? []) qs.append('provider', p);
    if (input?.sort) {
      qs.set('sortKey', input.sort.key);
      qs.set('sortDir', input.sort.direction);
    }
    const body = await apiGet<unknown>(`/nodes?${qs.toString()}`, false);
    return normalizeListResponse(body);
  }

  async create(entity: Node): Promise<Node> {
    return apiPost<Node>('/nodes', entity);
  }

  async update(entity: Node): Promise<Node> {
    const {
      id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...payload
    } = entity;
    return apiPatch<Node>(`/nodes/${encodeURIComponent(id)}`, payload);
  }

  async delete(id: string): Promise<boolean> {
    return apiDelete(`/nodes/${encodeURIComponent(id)}`);
  }

  async bulkDelete(ids: string[]): Promise<BulkResult> {
    const body = await apiPost<BulkResult | null>('/nodes/bulk-delete', {
      ids,
    });
    return body ?? { succeeded: ids, failed: [] };
  }

  async getMetrics(id: string, range: MetricsRange): Promise<MetricsPoint[]> {
    const qs = new URLSearchParams({ range });
    const body = await apiGet<MetricsPoint[]>(
      `/nodes/${encodeURIComponent(id)}/metrics?${qs.toString()}`,
      false,
    );
    return body ?? [];
  }

  // ─── RFC 0026 5-axis state mutations ─────────────────────────────────────

  async setLifecycle(
    id: string,
    lifecycle: NodeLifecycleState,
    expectedVersion: number,
  ): Promise<Node> {
    return apiPost<Node>(`/nodes/${encodeURIComponent(id)}/lifecycle`, {
      lifecycle,
      expectedVersion,
    });
  }

  async setEligibility(
    id: string,
    eligibility: NodeEligibility,
    expectedVersion: number,
  ): Promise<Node> {
    return apiPost<Node>(`/nodes/${encodeURIComponent(id)}/eligibility`, {
      eligibility,
      expectedVersion,
    });
  }

  /**
   * Drain start vs cancel routes through different server endpoints —
   * `null` clears the drain row entirely (Nomad semantics: absence ≠
   * inactive). Body shape matches spec §5.2.
   */
  async setDrain(
    id: string,
    drain: NodeDrain | null,
    expectedVersion: number,
  ): Promise<Node> {
    if (drain === null) {
      return apiPost<Node>(`/nodes/${encodeURIComponent(id)}/drain/cancel`, {
        expectedVersion,
      });
    }
    return apiPost<Node>(`/nodes/${encodeURIComponent(id)}/drain`, {
      drain,
      expectedVersion,
    });
  }
}

function normalizeListResponse(body: unknown): ListNodesRepositoryResult {
  if (Array.isArray(body)) {
    const items = body as Node[];
    return {
      items,
      total: items.length,
      nextCursor: null,
      facets: { lifecycle: {}, region: {}, provider: {} },
    };
  }
  const envelope = (body ?? {}) as Partial<ListNodesRepositoryResult>;
  return {
    items: envelope.items ?? [],
    total: envelope.total ?? envelope.items?.length ?? 0,
    nextCursor: envelope.nextCursor ?? null,
    facets: envelope.facets ?? { lifecycle: {}, region: {}, provider: {} },
  };
}
