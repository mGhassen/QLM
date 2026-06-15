import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';

import type { Repositories, ISecretVault } from '@guepard/domain/repositories';
import {
  CreateIntegrationConnectionService,
  DeleteIntegrationConnectionService,
  ListProviderRegionsService,
  TestIntegrationConnectionService,
  UpdateIntegrationConnectionService,
  UpdateIntegrationCredentialsService,
  splitCredentialsForStorage,
  type IIntegrationProviderDriverRegistry,
  type RevealedCredentials,
} from '@guepard/domain/services';
import { IntegrationConnectionOutput } from '@guepard/domain/usecases';

import { handleDomainException } from '../lib/http-utils';
import { createRateLimiter, type RateLimiter } from '../lib/rate-limiter';

export type IntegrationsRoutesOptions = {
  vault: ISecretVault;
  driverRegistry: IIntegrationProviderDriverRegistry;
  testRateLimiter?: RateLimiter;
};

const listQuerySchema = z.object({ projectId: z.string().min(1) });
const idParamSchema = z.object({ id: z.string().min(1) });

const credentialsValueSchema = z.record(z.string(), z.unknown());

const createBodySchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  credentials: credentialsValueSchema,
  createdBy: z.string().optional().default(''),
});

const renameBodySchema = z.object({
  name: z.string().optional(),
  updatedBy: z.string().optional().default(''),
});

const rotateCredentialsBodySchema = z.object({
  credentials: credentialsValueSchema,
  updatedBy: z.string().optional().default(''),
});

const testDraftBodySchema = z.object({
  credentials: credentialsValueSchema,
});

/**
 * Hono route factory for `/api/integrations` — spec §5.2.
 *
 * Nine endpoints: list, create, dry-test (pre-save), read one, rename,
 * rotate credentials, delete, post-save test, list regions. Secrets flow
 * ONLY on create, rotate, and dry-test; every other endpoint is vault-free.
 *
 * The services are instantiated per-request so they pick up the
 * request-scoped `repos` (which in turn carries the authenticated
 * Supabase client). The vault and the driver registry are process-wide
 * singletons injected through `options`.
 */
export function createIntegrationsRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
  options: IntegrationsRoutesOptions,
) {
  const { vault, driverRegistry } = options;
  const rateLimiter =
    options.testRateLimiter ?? createRateLimiter({ windowMs: 60_000, max: 10 });
  const app = new Hono();

  // ── Feature flag ───────────────────────────────────────────────────────
  // `VITE_FEATURE_INTEGRATIONS=false` in the server env kills every
  // integrations endpoint with a 404 so operators can back out of phase 1
  // without a redeploy. The same env var gates the browser-side manifest
  // (see packages/apps/integrations/src/manifest.ts), so flipping it in
  // one place disables the feature on both surfaces.
  app.use('*', async (c, next) => {
    if (process.env.VITE_FEATURE_INTEGRATIONS === 'false') {
      return c.json({ error: 'integrations_feature_disabled' }, 404);
    }
    await next();
  });

  // ── GET / — list by project ────────────────────────────────────────────
  app.get('/', zValidator('query', listQuerySchema), async (c) => {
    try {
      const { projectId } = c.req.valid('query');
      const repos = await getRepositories(c);
      const rows = await repos.integrationConnection.findByProjectId(projectId);
      return c.json(rows.map((row) => IntegrationConnectionOutput.new(row)));
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // ── POST /test-draft — dry test a credentials payload ──────────────────
  // Declared BEFORE /:id so Hono routes `/test-draft` to this handler
  // instead of falling through to GET /:id with id="test-draft".
  app.post(
    '/test-draft',
    zValidator('json', testDraftBodySchema),
    async (c) => {
      try {
        const credentials = c.req.valid('json').credentials as Parameters<
          typeof splitCredentialsForStorage
        >[0];

        const rateKey = `test-draft:${c.req.header('x-forwarded-for') ?? 'anon'}`;
        const decision = rateLimiter.check(rateKey);
        if (!decision.allowed) {
          c.header('Retry-After', String(decision.retryAfterSeconds));
          return c.json(
            {
              error: 'rate_limited',
              retryAfterSeconds: decision.retryAfterSeconds,
            },
            429,
          );
        }

        // Validate + split the credentials even though we don't persist them.
        // Catches malformed GCP JSON before handing them to a driver.
        splitCredentialsForStorage(credentials);

        const revealed = toRevealedCredentials(credentials);
        const driver = driverRegistry.resolve(revealed.provider);
        const result = await driver.testConnection(revealed);
        return c.json(result);
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  // ── POST / — create ────────────────────────────────────────────────────
  app.post('/', zValidator('json', createBodySchema), async (c) => {
    try {
      const body = c.req.valid('json');
      const repos = await getRepositories(c);
      const service = new CreateIntegrationConnectionService(
        repos.integrationConnection,
        vault,
      );
      const output = await service.execute({
        projectId: body.projectId,
        name: body.name,
        credentials: body.credentials as Parameters<
          typeof splitCredentialsForStorage
        >[0],
        createdBy: body.createdBy,
      });
      return c.json(output, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // ── GET /:id — read one ────────────────────────────────────────────────
  app.get('/:id', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');
      const repos = await getRepositories(c);
      const row = await repos.integrationConnection.findById(id);
      if (!row) return c.json({ error: 'Integration not found' }, 404);
      return c.json(IntegrationConnectionOutput.new(row));
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // ── PATCH /:id — rename ────────────────────────────────────────────────
  app.patch(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('json', renameBodySchema),
    async (c) => {
      try {
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        const repos = await getRepositories(c);
        const service = new UpdateIntegrationConnectionService(
          repos.integrationConnection,
        );
        const output = await service.execute({
          id,
          ...(typeof body.name === 'string' && { name: body.name }),
          updatedBy: body.updatedBy,
        });
        return c.json(output);
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  // ── PUT /:id/credentials — rotate credentials ──────────────────────────
  app.put(
    '/:id/credentials',
    zValidator('param', idParamSchema),
    zValidator('json', rotateCredentialsBodySchema),
    async (c) => {
      try {
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        const repos = await getRepositories(c);
        const service = new UpdateIntegrationCredentialsService(
          repos.integrationConnection,
          vault,
        );
        const output = await service.execute({
          id,
          credentials: body.credentials as Parameters<
            typeof splitCredentialsForStorage
          >[0],
          updatedBy: body.updatedBy,
        });
        return c.json(output);
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  // ── DELETE /:id ────────────────────────────────────────────────────────
  app.delete('/:id', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');
      const repos = await getRepositories(c);
      const service = new DeleteIntegrationConnectionService(
        repos.integrationConnection,
        vault,
      );
      await service.execute(id);
      return c.json({ success: true });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // ── POST /:id/test — run a connection test against an existing row ────
  app.post('/:id/test', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');

      const rateKey = `test:${c.req.header('x-forwarded-for') ?? 'anon'}:${id}`;
      const decision = rateLimiter.check(rateKey);
      if (!decision.allowed) {
        c.header('Retry-After', String(decision.retryAfterSeconds));
        return c.json(
          {
            error: 'rate_limited',
            retryAfterSeconds: decision.retryAfterSeconds,
          },
          429,
        );
      }

      const repos = await getRepositories(c);
      const service = new TestIntegrationConnectionService(
        repos.integrationConnection,
        vault,
        driverRegistry,
      );
      const result = await service.execute(id);
      return c.json(result);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // ── GET /:id/regions — live region list ────────────────────────────────
  app.get('/:id/regions', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');
      const repos = await getRepositories(c);
      const service = new ListProviderRegionsService(
        repos.integrationConnection,
        vault,
        driverRegistry,
      );
      const regions = await service.execute(id);
      return c.json(regions);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}

/**
 * Cast an incoming body `credentials` object into the `RevealedCredentials`
 * shape the driver expects. Used by `/test-draft` which never touches the
 * vault and so never round-trips through `buildRevealedCredentials`. The
 * domain type is a discriminated union so this is safe at runtime as long
 * as the `provider` field matches the rest of the shape.
 */
function toRevealedCredentials(input: unknown): RevealedCredentials {
  const obj = (input ?? {}) as Record<string, unknown>;
  const provider = obj.provider;
  if (provider === 'aws') {
    return {
      provider: 'aws',
      accessKeyId: String(obj.accessKeyId ?? ''),
      secretAccessKey: String(obj.secretAccessKey ?? ''),
      ...(typeof obj.sessionToken === 'string' && {
        sessionToken: obj.sessionToken,
      }),
      defaultRegion: String(obj.defaultRegion ?? ''),
    };
  }
  if (provider === 'gcp') {
    return {
      provider: 'gcp',
      serviceAccountJson: String(obj.serviceAccountJson ?? ''),
      defaultRegion: String(obj.defaultRegion ?? ''),
    };
  }
  throw new Error(
    `Unsupported provider for credentials payload: ${String(provider)}`,
  );
}
