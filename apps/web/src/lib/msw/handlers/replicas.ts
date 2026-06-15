import { http, HttpResponse } from 'msw';

import type { Replica } from '@guepard/infrastructure/types';

const PROVISIONING_MS = 4_000;

const stores = new Map<string, Replica[]>();

function storeFor(projectId: string): Replica[] {
  if (!stores.has(projectId)) stores.set(projectId, []);
  return stores.get(projectId)!;
}

function latency<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function resolveStatus(replica: Replica): Replica {
  if (
    replica.status === 'provisioning' &&
    Date.now() - new Date(replica.createdAt).getTime() > PROVISIONING_MS
  ) {
    return { ...replica, status: 'available' };
  }
  return replica;
}

export const replicasHandlers = [
  http.get('/api/replicas', async ({ request }) => {
    const projectId = new URL(request.url).searchParams.get('projectId');
    if (!projectId) {
      return HttpResponse.json(
        { error: 'projectId required' },
        { status: 400 },
      );
    }
    const list = storeFor(projectId).map(resolveStatus);
    return HttpResponse.json(await latency(list));
  }),

  http.post('/api/replicas', async ({ request }) => {
    const body = (await request.json()) as Pick<
      Replica,
      'projectId' | 'region' | 'provider' | 'computeTier'
    >;
    const replica: Replica = {
      id: `replica-${crypto.randomUUID()}`,
      projectId: body.projectId,
      region: body.region,
      provider: body.provider,
      computeTier: body.computeTier,
      status: 'provisioning',
      createdAt: new Date().toISOString(),
    };
    storeFor(body.projectId).push(replica);
    return HttpResponse.json(await latency(replica), { status: 201 });
  }),

  http.delete('/api/replicas/:id', async ({ params, request }) => {
    const id = String(params.id);
    const projectId = new URL(request.url).searchParams.get('projectId') ?? '';
    const list = storeFor(projectId);
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1)
      return HttpResponse.json({ error: 'not found' }, { status: 404 });
    list.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
