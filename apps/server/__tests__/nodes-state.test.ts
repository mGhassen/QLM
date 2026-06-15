import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { Code } from '@guepard/domain/common';
import { DomainException } from '@guepard/domain/exceptions';
import type { Node } from '@guepard/domain/entities';
import type { Repositories } from '@guepard/domain/repositories';

import { createNodesRoutes } from '../src/routes/nodes';

const baseNode: Node = {
  id: 'n1',
  projectId: 'org-1',
  name: 'node-one',
  kind: 'standard-2',
  region: 'us-east-1',
  status: 'running',
  cpuCores: 4,
  memoryGb: 8,
  tags: [],
  version: 7,
  lifecycle: 'active',
  orchestration: 'ready',
  eligibility: 'eligible',
  createdAt: '2026-04-27T00:00:00.000Z',
  updatedAt: '2026-04-27T00:00:00.000Z',
};

function makeApp(repositories: Partial<Repositories>) {
  const app = new Hono();
  const router = createNodesRoutes(async () => repositories as Repositories);
  app.route('/api/nodes', router);
  return app;
}

function makeNodeRepo(
  overrides: Partial<Repositories['node']>,
): Repositories['node'] {
  return {
    findById: vi.fn(),
    setLifecycle: vi.fn(),
    setEligibility: vi.fn(),
    setDrain: vi.fn(),
    ...overrides,
  } as unknown as Repositories['node'];
}

const NOT_FOUND = DomainException.new({
  code: Code.NODE_NOT_FOUND_ERROR,
  overrideMessage: "Node 'n1' not found",
  data: { nodeId: 'n1' },
});

const VERSION_CONFLICT = DomainException.new({
  code: Code.NODE_VERSION_CONFLICT_ERROR,
  overrideMessage: "Node 'n1' version conflict",
  data: { nodeId: 'n1', expectedVersion: 7, actualVersion: 9 },
});

describe('POST /api/nodes/:id/lifecycle', () => {
  it('200 happy path', async () => {
    const updated: Node = { ...baseNode, lifecycle: 'stopping', version: 8 };
    const findById = vi.fn().mockResolvedValue(baseNode);
    const setLifecycle = vi.fn().mockResolvedValue(updated);
    const node = makeNodeRepo({ findById, setLifecycle });
    const app = makeApp({ node } as Partial<Repositories>);

    const res = await app.request('http://localhost/api/nodes/n1/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lifecycle: 'stopping', expectedVersion: 7 }),
    });
    expect(res.status).toBe(200);
    expect(setLifecycle).toHaveBeenCalledWith('n1', 'stopping', 7);
    const body = (await res.json()) as { lifecycle: string };
    expect(body.lifecycle).toBe('stopping');
  });

  it('400 on schema fail (unknown lifecycle)', async () => {
    const app = makeApp({ node: makeNodeRepo({}) });
    const res = await app.request('http://localhost/api/nodes/n1/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lifecycle: 'banana', expectedVersion: 1 }),
    });
    expect(res.status).toBe(400);
  });

  it('404 when node not found', async () => {
    const node = makeNodeRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const app = makeApp({ node });
    const res = await app.request('http://localhost/api/nodes/n1/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lifecycle: 'stopped', expectedVersion: 1 }),
    });
    expect(res.status).toBe(404);
  });

  it('409 on version conflict', async () => {
    const node = makeNodeRepo({
      findById: vi.fn().mockResolvedValue({ ...baseNode, version: 9 }),
    });
    const app = makeApp({ node });
    const res = await app.request('http://localhost/api/nodes/n1/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lifecycle: 'stopped', expectedVersion: 7 }),
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/nodes/:id/eligibility', () => {
  it('200 happy path', async () => {
    const updated: Node = {
      ...baseNode,
      eligibility: 'ineligible',
      version: 8,
    };
    const setEligibility = vi.fn().mockResolvedValue(updated);
    const node = makeNodeRepo({
      findById: vi.fn().mockResolvedValue(baseNode),
      setEligibility,
    });
    const app = makeApp({ node });

    const res = await app.request('http://localhost/api/nodes/n1/eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eligibility: 'ineligible', expectedVersion: 7 }),
    });
    expect(res.status).toBe(200);
    expect(setEligibility).toHaveBeenCalledWith('n1', 'ineligible', 7);
  });

  it('400 on missing field', async () => {
    const app = makeApp({ node: makeNodeRepo({}) });
    const res = await app.request('http://localhost/api/nodes/n1/eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedVersion: 1 }),
    });
    expect(res.status).toBe(400);
  });

  it('404 when missing', async () => {
    const node = makeNodeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const app = makeApp({ node });
    const res = await app.request('http://localhost/api/nodes/n1/eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eligibility: 'eligible', expectedVersion: 1 }),
    });
    expect(res.status).toBe(404);
  });

  it('409 on version conflict', async () => {
    const node = makeNodeRepo({
      findById: vi.fn().mockResolvedValue({ ...baseNode, version: 9 }),
    });
    const app = makeApp({ node });
    const res = await app.request('http://localhost/api/nodes/n1/eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eligibility: 'ineligible', expectedVersion: 7 }),
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/nodes/:id/drain', () => {
  it('200 happy path — flips eligibility by default', async () => {
    const afterDrain: Node = { ...baseNode, version: 8 };
    const afterEligibility: Node = {
      ...afterDrain,
      version: 9,
      eligibility: 'ineligible',
    };
    const setDrain = vi.fn().mockResolvedValue(afterDrain);
    const setEligibility = vi.fn().mockResolvedValue(afterEligibility);
    const node = makeNodeRepo({
      findById: vi.fn().mockResolvedValue(baseNode),
      setDrain,
      setEligibility,
    });
    const app = makeApp({ node });

    const res = await app.request('http://localhost/api/nodes/n1/drain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drain: { active: true, ignoreSystemJobs: false, force: false },
        expectedVersion: 7,
      }),
    });
    expect(res.status).toBe(200);
    expect(setDrain).toHaveBeenCalled();
    expect(setEligibility).toHaveBeenCalledWith('n1', 'ineligible', 8);
  });

  it('200 — setIneligibleOnStart=false skips eligibility flip', async () => {
    const afterDrain: Node = { ...baseNode, version: 8 };
    const setDrain = vi.fn().mockResolvedValue(afterDrain);
    const setEligibility = vi.fn();
    const node = makeNodeRepo({
      findById: vi.fn().mockResolvedValue(baseNode),
      setDrain,
      setEligibility,
    });
    const app = makeApp({ node });

    const res = await app.request('http://localhost/api/nodes/n1/drain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drain: { active: true, ignoreSystemJobs: false, force: false },
        expectedVersion: 7,
        setIneligibleOnStart: false,
      }),
    });
    expect(res.status).toBe(200);
    expect(setEligibility).not.toHaveBeenCalled();
  });

  it('400 on missing drain', async () => {
    const app = makeApp({ node: makeNodeRepo({}) });
    const res = await app.request('http://localhost/api/nodes/n1/drain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedVersion: 1 }),
    });
    expect(res.status).toBe(400);
  });

  it('404 when missing', async () => {
    const node = makeNodeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const app = makeApp({ node });
    const res = await app.request('http://localhost/api/nodes/n1/drain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drain: { active: true, ignoreSystemJobs: false, force: false },
        expectedVersion: 1,
      }),
    });
    expect(res.status).toBe(404);
  });

  it('409 on version conflict', async () => {
    const node = makeNodeRepo({
      findById: vi.fn().mockResolvedValue({ ...baseNode, version: 9 }),
    });
    const app = makeApp({ node });
    const res = await app.request('http://localhost/api/nodes/n1/drain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drain: { active: true, ignoreSystemJobs: false, force: false },
        expectedVersion: 7,
      }),
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/nodes/:id/drain/cancel', () => {
  // Default mirrors Nomad: cancelling a drain does NOT auto-flip eligibility.
  // Operator opts in by sending `keepIneligible: false`.
  it('200 happy path — clears drain, eligibility unchanged by default', async () => {
    const setDrain = vi.fn().mockResolvedValue({ ...baseNode, version: 8 });
    const setEligibility = vi.fn();
    const node = makeNodeRepo({
      findById: vi
        .fn()
        .mockResolvedValue({ ...baseNode, eligibility: 'ineligible' }),
      setDrain,
      setEligibility,
    });
    const app = makeApp({ node });

    const res = await app.request(
      'http://localhost/api/nodes/n1/drain/cancel',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: 7 }),
      },
    );
    expect(res.status).toBe(200);
    expect(setDrain).toHaveBeenCalledWith('n1', null, 7);
    expect(setEligibility).not.toHaveBeenCalled();
  });

  it('200 — keepIneligible=false flips eligibility back to eligible', async () => {
    const setDrain = vi.fn().mockResolvedValue({ ...baseNode, version: 8 });
    const setEligibility = vi
      .fn()
      .mockResolvedValue({ ...baseNode, version: 9, eligibility: 'eligible' });
    const node = makeNodeRepo({
      findById: vi
        .fn()
        .mockResolvedValue({ ...baseNode, eligibility: 'ineligible' }),
      setDrain,
      setEligibility,
    });
    const app = makeApp({ node });

    const res = await app.request(
      'http://localhost/api/nodes/n1/drain/cancel',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: 7, keepIneligible: false }),
      },
    );
    expect(res.status).toBe(200);
    expect(setEligibility).toHaveBeenCalledWith('n1', 'eligible', 8);
  });

  it('400 on missing expectedVersion', async () => {
    const app = makeApp({ node: makeNodeRepo({}) });
    const res = await app.request(
      'http://localhost/api/nodes/n1/drain/cancel',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    );
    expect(res.status).toBe(400);
  });

  it('404 when missing', async () => {
    const node = makeNodeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const app = makeApp({ node });
    const res = await app.request(
      'http://localhost/api/nodes/n1/drain/cancel',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: 1 }),
      },
    );
    expect(res.status).toBe(404);
  });

  it('409 on version conflict', async () => {
    const node = makeNodeRepo({
      findById: vi.fn().mockResolvedValue({ ...baseNode, version: 9 }),
    });
    const app = makeApp({ node });
    const res = await app.request(
      'http://localhost/api/nodes/n1/drain/cancel',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: 7 }),
      },
    );
    expect(res.status).toBe(409);
  });
});

// Defensive — silences unused `NOT_FOUND`/`VERSION_CONFLICT` warning if not used.
void NOT_FOUND;
void VERSION_CONFLICT;
