import { http, HttpResponse } from 'msw';

import type { DatabaseOutput } from '@qlm/domain/usecases';

import { seedDatabases } from '../fixtures/databases';

const stores = new Map<string, DatabaseOutput[]>();

function getStore(projectId: string): DatabaseOutput[] {
  let s = stores.get(projectId);
  if (!s) {
    s = seedDatabases(projectId);
    stores.set(projectId, s);
  }
  return s;
}

function resolveProjectId(request: Request): string {
  // Use Authorization header token as a stable project-scoped key for MSW.
  // Falls back to a constant so stories without auth still get data.
  const auth = request.headers.get('Authorization');
  return auth ? auth.slice(-12) : 'msw-default';
}

function delay<T>(value: T, ms = 100): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const databasesHandlers = [
  http.get('/api/databases', async ({ request }) => {
    const projectId = resolveProjectId(request);
    const rows = getStore(projectId).filter((db) => db.status !== 'deleted');
    return HttpResponse.json(await delay(rows));
  }),

  http.get('/api/databases/:id', async ({ request, params }) => {
    const projectId = resolveProjectId(request);
    const store = getStore(projectId);
    const db = store.find((d) => d.id === params['id']);
    if (!db) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(await delay(db));
  }),

  http.post('/api/databases', async ({ request }) => {
    const projectId = resolveProjectId(request);
    const store = getStore(projectId);
    const body = (await request.json()) as Partial<DatabaseOutput>;
    const created: DatabaseOutput = {
      id: crypto.randomUUID(),
      name: body.name ?? 'untitled',
      accountId: projectId,
      provider: body.provider ?? 'postgres',
      version: body.version ?? '15',
      status: 'init',
      deploymentType: body.deploymentType ?? 'repository',
      fqdn: body.fqdn ?? `${body.name ?? 'untitled'}.db.qlm.internal`,
      port: body.port,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.push(created);
    return HttpResponse.json(await delay(created, 120), { status: 201 });
  }),

  http.patch('/api/databases/:id', async ({ request, params }) => {
    const projectId = resolveProjectId(request);
    const store = getStore(projectId);
    const idx = store.findIndex((d) => d.id === params['id']);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Partial<DatabaseOutput>;
    const updated = {
      ...store[idx]!,
      ...body,
      id: params['id'] as string,
      updatedAt: new Date().toISOString(),
    };
    store[idx] = updated;
    return HttpResponse.json(await delay(updated));
  }),

  http.delete('/api/databases/:id', async ({ request, params }) => {
    const projectId = resolveProjectId(request);
    const store = getStore(projectId);
    const idx = store.findIndex((d) => d.id === params['id']);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    store[idx] = {
      ...store[idx]!,
      status: 'deleted',
      updatedAt: new Date().toISOString(),
    };
    return new HttpResponse(null, { status: 204 });
  }),
];
