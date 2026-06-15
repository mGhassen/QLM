import { http, HttpResponse } from 'msw';

import type {
  Node,
  NodeDrain,
  NodeEligibility,
  NodeLifecycleState,
  NodeProvider,
  NodeRegion,
} from '@guepard/domain/entities';
import type {
  BulkResult,
  ListNodesRepositoryResult,
} from '@guepard/domain/usecases';

import { generateMetrics24h, seedNodes } from '../fixtures/nodes';

const stores = new Map<string, Node[]>();

function storeFor(projectId: string): Node[] {
  let s = stores.get(projectId);
  if (!s) {
    s = seedNodes(projectId);
    stores.set(projectId, s);
  }
  return s;
}

function findNode(id: string): { projectId: string; index: number } | null {
  for (const [projectId, list] of stores.entries()) {
    const index = list.findIndex((n) => n.id === id);
    if (index !== -1) return { projectId, index };
  }
  return null;
}

function latency<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function toFacets(nodes: Node[]): ListNodesRepositoryResult['facets'] {
  const lifecycle: Partial<Record<NodeLifecycleState, number>> = {};
  const region: Partial<Record<NodeRegion, number>> = {};
  const provider: Partial<Record<NodeProvider, number>> = {};
  for (const n of nodes) {
    if (n.lifecycle) {
      lifecycle[n.lifecycle] = (lifecycle[n.lifecycle] ?? 0) + 1;
    }
    region[n.region] = (region[n.region] ?? 0) + 1;
    if (n.provider) provider[n.provider] = (provider[n.provider] ?? 0) + 1;
  }
  return { lifecycle, region, provider };
}

function matchesFilter(node: Node, url: URL): boolean {
  const search = url.searchParams.get('search')?.toLowerCase() ?? '';
  if (
    search &&
    !node.name.toLowerCase().includes(search) &&
    !node.id.toLowerCase().includes(search) &&
    !node.tags.some((t) => t.toLowerCase().includes(search))
  ) {
    return false;
  }
  const lifecycles = url.searchParams.getAll('lifecycle');
  if (
    lifecycles.length &&
    (!node.lifecycle || !lifecycles.includes(node.lifecycle))
  ) {
    return false;
  }
  const eligibilities = url.searchParams.getAll('eligibility');
  if (
    eligibilities.length &&
    (!node.eligibility || !eligibilities.includes(node.eligibility))
  ) {
    return false;
  }
  const regions = url.searchParams.getAll('region');
  if (regions.length && !regions.includes(node.region)) return false;
  const providers = url.searchParams.getAll('provider');
  if (
    providers.length &&
    (!node.provider || !providers.includes(node.provider))
  ) {
    return false;
  }
  return true;
}

export const nodesHandlers = [
  http.get('/api/nodes', async ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    if (!projectId) {
      return HttpResponse.json(
        { error: 'projectId required' },
        { status: 400 },
      );
    }
    const list = storeFor(projectId);
    const filtered = list.filter((n) => matchesFilter(n, url));
    const limit =
      Number(url.searchParams.get('limit') ?? '0') || filtered.length;
    const cursor = Number(url.searchParams.get('cursor') ?? '0') || 0;
    const pageItems = filtered.slice(cursor, cursor + limit);
    const next = cursor + limit;
    const envelope: ListNodesRepositoryResult = {
      items: pageItems,
      total: filtered.length,
      nextCursor: next < filtered.length ? String(next) : null,
      facets: toFacets(list),
    };
    return HttpResponse.json(await latency(envelope));
  }),

  http.get('/api/nodes/:id', async ({ params }) => {
    const id = String(params.id);
    const hit = findNode(id);
    if (!hit) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    const node = stores.get(hit.projectId)![hit.index];
    return HttpResponse.json(await latency(node));
  }),

  http.get('/api/nodes/:id/metrics', async ({ params, request }) => {
    const id = String(params.id);
    const hit = findNode(id);
    if (!hit) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    const node = stores.get(hit.projectId)![hit.index]!;
    const url = new URL(request.url);
    const range = url.searchParams.get('range') ?? '24h';
    if (range !== '24h') {
      return HttpResponse.json(
        { error: 'Only 24h range is mocked' },
        { status: 400 },
      );
    }
    return HttpResponse.json(await latency(generateMetrics24h(node)));
  }),

  http.post('/api/nodes', async ({ request }) => {
    const body = (await request.json()) as Node;
    const list = storeFor(body.projectId);
    const node: Node = {
      ...body,
      version: 1,
      health: body.health ?? 'unknown',
    };
    list.unshift(node);
    return HttpResponse.json(await latency(node), { status: 201 });
  }),

  http.patch('/api/nodes/:id', async ({ params, request }) => {
    const id = String(params.id);
    const hit = findNode(id);
    if (!hit) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    const body = (await request.json()) as Partial<Node>;
    const list = stores.get(hit.projectId)!;
    const current = list[hit.index]!;
    const next: Node = {
      ...current,
      ...body,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    list[hit.index] = next;
    return HttpResponse.json(await latency(next));
  }),

  http.delete('/api/nodes/:id', async ({ params }) => {
    const id = String(params.id);
    const hit = findNode(id);
    if (!hit) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    stores.get(hit.projectId)!.splice(hit.index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ─── RFC 0026 5-axis state mutations ─────────────────────────────────────

  http.post('/api/nodes/:id/lifecycle', async ({ params, request }) => {
    const id = String(params.id);
    const hit = findNode(id);
    if (!hit) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    const body = (await request.json()) as {
      lifecycle: NodeLifecycleState;
      expectedVersion: number;
    };
    const list = stores.get(hit.projectId)!;
    const current = list[hit.index]!;
    if (current.version !== body.expectedVersion) {
      return HttpResponse.json(
        {
          error: 'Version conflict',
          code: 3101,
          actualVersion: current.version,
        },
        { status: 409 },
      );
    }
    const next: Node = {
      ...current,
      lifecycle: body.lifecycle,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    list[hit.index] = next;
    return HttpResponse.json(await latency(next));
  }),

  http.post('/api/nodes/:id/eligibility', async ({ params, request }) => {
    const id = String(params.id);
    const hit = findNode(id);
    if (!hit) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    const body = (await request.json()) as {
      eligibility: NodeEligibility;
      expectedVersion: number;
    };
    const list = stores.get(hit.projectId)!;
    const current = list[hit.index]!;
    if (current.version !== body.expectedVersion) {
      return HttpResponse.json(
        {
          error: 'Version conflict',
          code: 3101,
          actualVersion: current.version,
        },
        { status: 409 },
      );
    }
    const next: Node = {
      ...current,
      eligibility: body.eligibility,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    list[hit.index] = next;
    return HttpResponse.json(await latency(next));
  }),

  http.post('/api/nodes/:id/drain', async ({ params, request }) => {
    const id = String(params.id);
    const hit = findNode(id);
    if (!hit) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    const body = (await request.json()) as {
      drain: NodeDrain;
      expectedVersion: number;
      setIneligibleOnStart?: boolean;
    };
    const list = stores.get(hit.projectId)!;
    const current = list[hit.index]!;
    if (current.version !== body.expectedVersion) {
      return HttpResponse.json(
        {
          error: 'Version conflict',
          code: 3101,
          actualVersion: current.version,
        },
        { status: 409 },
      );
    }
    const startedAt = new Date().toISOString();
    const flipEligibility = body.setIneligibleOnStart !== false;
    const next: Node = {
      ...current,
      drain: {
        active: true,
        deadline: body.drain.deadline,
        ignoreSystemJobs: body.drain.ignoreSystemJobs ?? false,
        force: body.drain.force ?? false,
        startedAt,
      },
      eligibility: flipEligibility ? 'ineligible' : current.eligibility,
      // Two writes (drain + eligibility) → bump version by 2 to mirror the
      // server-side path in DrainNodeService.
      version: current.version + (flipEligibility ? 2 : 1),
      updatedAt: startedAt,
    };
    list[hit.index] = next;
    return HttpResponse.json(await latency(next));
  }),

  http.post('/api/nodes/:id/drain/cancel', async ({ params, request }) => {
    const id = String(params.id);
    const hit = findNode(id);
    if (!hit) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    const body = (await request.json()) as {
      expectedVersion: number;
      keepIneligible?: boolean;
    };
    const list = stores.get(hit.projectId)!;
    const current = list[hit.index]!;
    if (current.version !== body.expectedVersion) {
      return HttpResponse.json(
        {
          error: 'Version conflict',
          code: 3101,
          actualVersion: current.version,
        },
        { status: 409 },
      );
    }
    const updatedAt = new Date().toISOString();
    const restoreEligibility = body.keepIneligible === false;
    const next: Node = {
      ...current,
      drain: undefined,
      eligibility: restoreEligibility ? 'eligible' : current.eligibility,
      version: current.version + (restoreEligibility ? 2 : 1),
      updatedAt,
    };
    list[hit.index] = next;
    return HttpResponse.json(await latency(next));
  }),

  http.post('/api/nodes/bulk-delete', async ({ request }) => {
    const body = (await request.json()) as { ids: string[] };
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of body.ids) {
      // Simulate ~5% random failure so the partial-failure UI is reachable.
      if (Math.random() < 0.05) {
        failed.push({ id, reason: 'Simulated transient error' });
        continue;
      }
      const hit = findNode(id);
      if (hit) {
        stores.get(hit.projectId)!.splice(hit.index, 1);
        succeeded.push(id);
      } else {
        failed.push({ id, reason: 'not-found' });
      }
    }
    const result: BulkResult = { succeeded, failed };
    return HttpResponse.json(await latency(result));
  }),
];

/**
 * Metrics-only mock handler loaded by the browser worker.
 * All other node endpoints pass through to the real server.
 */
export const nodesMetricsHandlers = [
  http.get('/api/nodes/:id/metrics', async ({ params, request }) => {
    const id = String(params.id);
    const hit = findNode(id);
    if (!hit) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    const node = stores.get(hit.projectId)![hit.index]!;
    const url = new URL(request.url);
    const range = url.searchParams.get('range') ?? '24h';
    if (range !== '24h') {
      return HttpResponse.json(
        { error: 'Only 24h range is mocked' },
        { status: 400 },
      );
    }
    return HttpResponse.json(await latency(generateMetrics24h(node)));
  }),
];
