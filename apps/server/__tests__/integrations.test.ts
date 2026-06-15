import { describe, expect, it, beforeAll } from 'vitest';
import { Hono } from 'hono';

import type {
  IntegrationConnection,
  IntegrationProvider,
} from '@qlm/domain/entities';
import { IIntegrationConnectionRepository } from '@qlm/domain/repositories';
import type {
  IntegrationTestResultUpdate,
  ISecretVault,
  Repositories,
} from '@qlm/domain/repositories';
import {
  IIntegrationProviderDriverRegistry,
  type IIntegrationProviderDriver,
  type RevealedCredentials,
} from '@qlm/domain/services';
import type { Region, TestResult } from '@qlm/domain/usecases';

import { createRateLimiter } from '../src/lib/rate-limiter.js';
import { createIntegrationsRoutes } from '../src/routes/integrations.js';
import { createMockRepositories } from './helpers/mock-repositories';

// ── Fakes ────────────────────────────────────────────────────────────────

class InMemoryIntegrationConnectionRepository extends IIntegrationConnectionRepository {
  private readonly rows = new Map<string, IntegrationConnection>();

  public seed(row: IntegrationConnection): void {
    this.rows.set(row.id, row);
  }

  public snapshot(id: string): IntegrationConnection | undefined {
    return this.rows.get(id);
  }

  async findAll() {
    return Array.from(this.rows.values());
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findBySlug(slug: string) {
    return (
      Array.from(this.rows.values()).find((row) => row.slug === slug) ?? null
    );
  }
  async findByProjectId(projectId: string) {
    return Array.from(this.rows.values()).filter(
      (row) => row.projectId === projectId,
    );
  }
  async findBySlugInProject(projectId: string, slug: string) {
    return (
      Array.from(this.rows.values()).find(
        (row) => row.projectId === projectId && row.slug === slug,
      ) ?? null
    );
  }
  async create(entity: IntegrationConnection) {
    this.rows.set(entity.id, entity);
    return entity;
  }
  async update(entity: IntegrationConnection) {
    if (!this.rows.has(entity.id)) {
      throw new Error(`Integration with id ${entity.id} not found`);
    }
    this.rows.set(entity.id, entity);
    return entity;
  }
  async delete(id: string) {
    return this.rows.delete(id);
  }
  async updateTestResult(id: string, result: IntegrationTestResultUpdate) {
    const existing = this.rows.get(id);
    if (!existing) return;
    this.rows.set(id, {
      ...existing,
      testStatus: result.status,
      testIdentity: result.identity,
      testError: result.error,
      testedAt: result.testedAt,
    });
  }
  async updateCredentialsRef(
    id: string,
    newSecretRef: string,
    updatedBy: string,
  ) {
    const existing = this.rows.get(id);
    if (!existing) return;
    this.rows.set(id, {
      ...existing,
      secretRef: newSecretRef,
      testStatus: 'untested',
      testIdentity: null,
      testError: null,
      testedAt: null,
      updatedBy,
      updatedAt: new Date(),
    });
  }
  shortenId(id: string) {
    return id.slice(0, 8);
  }
}

class InMemorySecretVault implements ISecretVault {
  private readonly store = new Map<string, string>();
  private counter = 0;
  public readonly forgotten: string[] = [];

  async protect(value: string, context: { keyName: string }) {
    const handle = `mem:${context.keyName}:${++this.counter}`;
    this.store.set(handle, value);
    return handle;
  }
  async reveal(protectedValue: string) {
    const value = this.store.get(protectedValue);
    if (value === undefined) {
      throw new Error(`Unknown vault handle: ${protectedValue}`);
    }
    return value;
  }
  isProtected(value: string) {
    return value.startsWith('mem:');
  }
  async forget(protectedValue: string) {
    this.forgotten.push(protectedValue);
    this.store.delete(protectedValue);
  }
}

class StubProviderDriver implements IIntegrationProviderDriver {
  public nextTestResult: TestResult = {
    ok: true,
    identity: 'arn:aws:iam::123456789012:user/stub',
  };
  public nextRegions: Region[] = [{ id: 'us-east-1', name: 'us-east-1' }];
  public readonly testCalls: RevealedCredentials[] = [];

  constructor(public readonly provider: IntegrationProvider) {}

  async testConnection(creds: RevealedCredentials) {
    this.testCalls.push(creds);
    return this.nextTestResult;
  }
  async listRegions(_creds: RevealedCredentials) {
    return this.nextRegions;
  }
}

class StubDriverRegistry extends IIntegrationProviderDriverRegistry {
  constructor(
    private readonly drivers: Record<IntegrationProvider, StubProviderDriver>,
  ) {
    super();
  }
  resolve(provider: IntegrationProvider) {
    return this.drivers[provider];
  }
}

// ── Test harness ─────────────────────────────────────────────────────────

type Harness = {
  app: Hono;
  repos: Repositories;
  integrationRepo: InMemoryIntegrationConnectionRepository;
  vault: InMemorySecretVault;
  awsDriver: StubProviderDriver;
  gcpDriver: StubProviderDriver;
};

function makeHarness(): Harness {
  // Build a minimal Hono app mounted with ONLY the integrations routes. We
  // intentionally bypass `createApp`/`server.ts` because its import chain
  // pulls in `@mlc-ai/web-llm` (via the chat route → agent-factory-sdk) and
  // that package has a broken CommonJS `require` inside an ESM module,
  // which crashes every test that touches `server.ts`. Tracked as a
  // pre-existing toolchain issue outside the scope of step 8.
  const integrationRepo = new InMemoryIntegrationConnectionRepository();
  const baseRepos = createMockRepositories();
  const repos: Repositories = {
    ...baseRepos,
    integrationConnection:
      integrationRepo as unknown as Repositories['integrationConnection'],
  };

  const vault = new InMemorySecretVault();
  const awsDriver = new StubProviderDriver('aws');
  const gcpDriver = new StubProviderDriver('gcp');
  const registry = new StubDriverRegistry({ aws: awsDriver, gcp: gcpDriver });

  const app = new Hono();
  app.route(
    '/api/integrations',
    createIntegrationsRoutes(async () => repos, {
      vault,
      driverRegistry: registry,
    }),
  );

  return { app, repos, integrationRepo, vault, awsDriver, gcpDriver };
}

const PROJECT_ID = '00000000-0000-4000-8000-000000000000';
const CREATED_BY = '22222222-2222-4222-8222-222222222222';

function makeSeedRow(
  overrides: Partial<IntegrationConnection> = {},
): IntegrationConnection {
  return {
    id: crypto.randomUUID(),
    projectId: PROJECT_ID,
    provider: 'aws',
    name: 'prod-aws',
    slug: 'prod-aws',
    config: { defaultRegion: 'us-east-1' },
    secretRef: 'mem:integration:aws:stub:1',
    testStatus: 'untested',
    testIdentity: null,
    testError: null,
    testedAt: null,
    createdAt: new Date('2026-04-11T10:00:00.000Z'),
    updatedAt: new Date('2026-04-11T10:00:00.000Z'),
    createdBy: CREATED_BY,
    updatedBy: CREATED_BY,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Server API — Integrations', () => {
  let harness: Harness;

  beforeAll(() => {
    harness = makeHarness();
  });

  beforeEach(() => {
    // Reset the in-memory state between tests so tests don't leak into
    // each other. Vault is rebuilt fresh so forgotten[] resets too.
  });

  describe('GET /api/integrations', () => {
    it('requires projectId query parameter', async () => {
      const res = await harness.app.request(
        'http://localhost/api/integrations',
      );
      expect(res.status).toBe(400);
      // zValidator returns Zod's issues array, not `{error: '...'}`.
      expect(JSON.stringify(await res.json())).toContain('projectId');
    });

    it('returns integrations filtered by project', async () => {
      harness.integrationRepo.seed(makeSeedRow());
      harness.integrationRepo.seed(
        makeSeedRow({
          projectId: '99999999-9999-4999-8999-999999999999',
          slug: 'other',
        }),
      );

      const res = await harness.app.request(
        `http://localhost/api/integrations?projectId=${PROJECT_ID}`,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Array<{ projectId: string }>;
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body.every((item) => item.projectId === PROJECT_ID)).toBe(true);
    });

    it('never exposes secretRef on the wire', async () => {
      harness.integrationRepo.seed(makeSeedRow({ secretRef: 'mem:secret:1' }));

      const res = await harness.app.request(
        `http://localhost/api/integrations?projectId=${PROJECT_ID}`,
      );
      const body = (await res.json()) as Array<Record<string, unknown>>;
      for (const item of body) {
        expect(item).not.toHaveProperty('secretRef');
        expect(item).not.toHaveProperty('secret_ref');
      }
    });
  });

  describe('POST /api/integrations', () => {
    it('creates an AWS integration and stores credentials in the vault', async () => {
      const res = await harness.app.request(
        'http://localhost/api/integrations',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            projectId: PROJECT_ID,
            name: 'fresh-aws',
            credentials: {
              provider: 'aws',
              accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
              secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
              defaultRegion: 'us-east-1',
            },
            createdBy: CREATED_BY,
          }),
        },
      );
      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        id: string;
        name: string;
        provider: string;
        config: { defaultRegion: string };
      };
      expect(body.name).toBe('fresh-aws');
      expect(body.provider).toBe('aws');
      expect(body.config.defaultRegion).toBe('us-east-1');
      expect(body).not.toHaveProperty('secretRef');

      const persisted = harness.integrationRepo.snapshot(body.id);
      expect(persisted?.secretRef).toMatch(/^mem:integration:aws:/);

      // The vault holds the raw credentials, not the row.
      const revealed = await harness.vault.reveal(persisted!.secretRef!);
      expect(revealed).toContain('AKIAIOSFODNN7EXAMPLE');
    });
  });

  describe('POST /api/integrations/test-draft', () => {
    it('runs a dry test without persisting anything', async () => {
      harness.awsDriver.nextTestResult = {
        ok: true,
        identity: 'arn:aws:iam::123456789012:user/dry',
      };

      const res = await harness.app.request(
        'http://localhost/api/integrations/test-draft',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            credentials: {
              provider: 'aws',
              accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
              secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
              defaultRegion: 'us-east-1',
            },
          }),
        },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; identity: string };
      expect(body).toEqual({
        ok: true,
        identity: 'arn:aws:iam::123456789012:user/dry',
      });
      // Driver received the forwarded credentials
      expect(harness.awsDriver.testCalls.length).toBeGreaterThan(0);
    });

    it('returns 400 when credentials field is missing', async () => {
      const res = await harness.app.request(
        'http://localhost/api/integrations/test-draft',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        },
      );
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/integrations/:id', () => {
    it('returns the row without exposing secretRef', async () => {
      const row = makeSeedRow({ slug: 'detail-test' });
      harness.integrationRepo.seed(row);

      const res = await harness.app.request(
        `http://localhost/api/integrations/${row.id}`,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.id).toBe(row.id);
      expect(body).not.toHaveProperty('secretRef');
    });

    it('returns 404 for an unknown id', async () => {
      const res = await harness.app.request(
        'http://localhost/api/integrations/nonexistent',
      );
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/integrations/:id', () => {
    it('renames an existing integration', async () => {
      const row = makeSeedRow({ name: 'old-name' });
      harness.integrationRepo.seed(row);

      const res = await harness.app.request(
        `http://localhost/api/integrations/${row.id}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'new-name', updatedBy: CREATED_BY }),
        },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { name: string };
      expect(body.name).toBe('new-name');
    });
  });

  describe('PUT /api/integrations/:id/credentials', () => {
    it('rotates credentials and resets the test state', async () => {
      const oldRef = await harness.vault.protect(
        JSON.stringify({ provider: 'aws', accessKeyId: 'AKIAOLD' }),
        { keyName: 'integration:aws:rotate' },
      );
      const row = makeSeedRow({
        secretRef: oldRef,
        testStatus: 'success',
        testIdentity: 'arn:aws:iam::123:user/old',
      });
      harness.integrationRepo.seed(row);

      const res = await harness.app.request(
        `http://localhost/api/integrations/${row.id}/credentials`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            credentials: {
              provider: 'aws',
              accessKeyId: 'AKIANEWEXAMPLE00001A',
              secretAccessKey: 'new-secret',
              defaultRegion: 'us-east-1',
            },
            updatedBy: CREATED_BY,
          }),
        },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        testStatus: string;
        testIdentity: string | null;
      };
      expect(body.testStatus).toBe('untested');
      expect(body.testIdentity).toBeNull();
      expect(harness.vault.forgotten).toContain(oldRef);
    });
  });

  describe('DELETE /api/integrations/:id', () => {
    it('deletes the row and forgets its vault handle', async () => {
      const ref = await harness.vault.protect(
        JSON.stringify({ provider: 'aws' }),
        { keyName: 'integration:aws:delete' },
      );
      const row = makeSeedRow({ secretRef: ref });
      harness.integrationRepo.seed(row);

      const res = await harness.app.request(
        `http://localhost/api/integrations/${row.id}`,
        { method: 'DELETE' },
      );
      expect(res.status).toBe(200);
      expect(harness.integrationRepo.snapshot(row.id)).toBeUndefined();
      expect(harness.vault.forgotten).toContain(ref);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await harness.app.request(
        'http://localhost/api/integrations/nonexistent',
        { method: 'DELETE' },
      );
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/integrations/:id/test', () => {
    it('persists a success result and returns it', async () => {
      const rawCreds = JSON.stringify({
        provider: 'aws',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      });
      const ref = await harness.vault.protect(rawCreds, {
        keyName: 'integration:aws:test',
      });
      const row = makeSeedRow({ secretRef: ref });
      harness.integrationRepo.seed(row);

      harness.awsDriver.nextTestResult = {
        ok: true,
        identity: 'arn:aws:iam::123456789012:user/persisted',
      };

      const res = await harness.app.request(
        `http://localhost/api/integrations/${row.id}/test`,
        { method: 'POST' },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; identity: string };
      expect(body.ok).toBe(true);
      expect(body.identity).toBe('arn:aws:iam::123456789012:user/persisted');

      const after = harness.integrationRepo.snapshot(row.id);
      expect(after?.testStatus).toBe('success');
      expect(after?.testIdentity).toBe(
        'arn:aws:iam::123456789012:user/persisted',
      );
      expect(after?.testedAt).toBeInstanceOf(Date);
    });

    it('persists a failure result with error message', async () => {
      const rawCreds = JSON.stringify({
        provider: 'aws',
        accessKeyId: 'AKIAFAIL',
        secretAccessKey: 'fail',
      });
      const ref = await harness.vault.protect(rawCreds, {
        keyName: 'integration:aws:test',
      });
      const row = makeSeedRow({ secretRef: ref });
      harness.integrationRepo.seed(row);

      harness.awsDriver.nextTestResult = {
        ok: false,
        errorCode: 'invalid_credentials',
        errorMessage: 'The security token is invalid',
      };

      const res = await harness.app.request(
        `http://localhost/api/integrations/${row.id}/test`,
        { method: 'POST' },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        ok: boolean;
        errorCode: string;
      };
      expect(body.ok).toBe(false);
      expect(body.errorCode).toBe('invalid_credentials');

      const after = harness.integrationRepo.snapshot(row.id);
      expect(after?.testStatus).toBe('failed');
    });

    it('rate limits repeated test requests', async () => {
      // Spin up a fresh app with a very small limiter so we can exercise it.
      const repo = new InMemoryIntegrationConnectionRepository();
      const vault = new InMemorySecretVault();
      const driver = new StubProviderDriver('aws');
      driver.nextTestResult = { ok: true, identity: 'arn:rate' };
      const registry = new StubDriverRegistry({ aws: driver, gcp: driver });

      const ref = await vault.protect(
        JSON.stringify({
          provider: 'aws',
          accessKeyId: 'AKIA',
          secretAccessKey: 'x',
        }),
        { keyName: 'integration:aws:rate' },
      );
      const row = makeSeedRow({ secretRef: ref });
      repo.seed(row);

      const base = createMockRepositories();
      const repos: Repositories = {
        ...base,
        integrationConnection:
          repo as unknown as Repositories['integrationConnection'],
      };
      const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
      const customApp = new Hono().route(
        '/',
        createIntegrationsRoutes(async () => repos, {
          vault,
          driverRegistry: registry,
          testRateLimiter: limiter,
        }),
      );

      // First two calls allowed.
      const res1 = await customApp.request(`http://localhost/${row.id}/test`, {
        method: 'POST',
      });
      expect(res1.status).toBe(200);
      const res2 = await customApp.request(`http://localhost/${row.id}/test`, {
        method: 'POST',
      });
      expect(res2.status).toBe(200);

      // Third call over the limit — 429.
      const res3 = await customApp.request(`http://localhost/${row.id}/test`, {
        method: 'POST',
      });
      expect(res3.status).toBe(429);
      expect(res3.headers.get('retry-after')).not.toBeNull();
      const body = (await res3.json()) as {
        error: string;
        retryAfterSeconds: number;
      };
      expect(body.error).toBe('rate_limited');
      expect(body.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe('GET /api/integrations/:id/regions', () => {
    it('returns the driver-supplied region list without persisting them', async () => {
      const ref = await harness.vault.protect(
        JSON.stringify({
          provider: 'aws',
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI',
        }),
        { keyName: 'integration:aws:regions' },
      );
      const row = makeSeedRow({ secretRef: ref });
      harness.integrationRepo.seed(row);
      harness.awsDriver.nextRegions = [
        { id: 'us-east-1', name: 'US East' },
        { id: 'eu-west-1', name: 'Europe (Ireland)' },
      ];

      const res = await harness.app.request(
        `http://localhost/api/integrations/${row.id}/regions`,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Region[];
      expect(body).toHaveLength(2);
      expect(body[0]).toEqual({ id: 'us-east-1', name: 'US East' });
    });
  });
});
