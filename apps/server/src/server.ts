import { Hono } from 'hono';
import type { Context } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { basicAuth } from 'hono/basic-auth';
import { DomainException } from '@qlm/domain/exceptions';
import { getLogger } from '@qlm/shared/logger';
import type { ISecretVault, Repositories } from '@qlm/domain/repositories';
import type { IIntegrationProviderDriverRegistry } from '@qlm/domain/services';
import { getRepositories } from './lib/repositories';
import { createServerSecretVault } from './lib/secret-vault';
import { createServerDriverRegistry } from './lib/integration-driver-registry';
import { createAuthRoutes, type SidecarAuthSupabase } from './routes/auth';
import { keyringClient } from './lib/keyring-client';
import { createChatRoutes } from './routes/chat';
import { createConversationsRoutes } from './routes/conversations';
import { createOrganizationsRoutes } from './routes/organizations';
import { createProjectsRoutes } from './routes/projects';
import { createDatasourcesRoutes } from './routes/datasources';
import { createDriverRoutes } from './routes/driver';
import { createExtensionsRoutes } from './routes/extensions';
import { createIntegrationsRoutes } from './routes/integrations';
import { createMessagesRoutes } from './routes/messages';
import { createFeedbackRoutes } from './routes/feedback';
import { createDatabasesRoutes } from './routes/databases';
import { createNodesRoutes } from './routes/nodes';
import { createPerformanceProfilesRoutes } from './routes/performance-profiles';
import { createNotebooksRoutes } from './routes/notebooks';
import { createPoolsRoutes } from './routes/pools';
import { createNotebookQueryRoutes } from './routes/notebook-query';
import { createUsageRoutes } from './routes/usage';
import { createUserPreferencesRoutes } from './routes/user-preferences';
import { createUserTokensRoutes } from './routes/user-tokens';
import { createInitRoutes } from './routes/init';
import { createPredictionsRoutes } from './routes/predictions';
import { handleMcpRequest } from './lib/mcp-handler';

function handleError(error: unknown): Response {
  if (error instanceof DomainException) {
    const status =
      // Resource-not-found bands: 2xxx (existing) and 3000 (USER_TOKEN_NOT_FOUND_ERROR).
      (error.code >= 2000 && error.code < 3000) || error.code === 3000
        ? 404
        : error.code >= 400 && error.code < 500
          ? error.code
          : 500;
    return Response.json(
      {
        error: error.message,
        code: error.code,
        data: error.data,
      },
      { status },
    );
  }
  const errorMessage =
    error instanceof Error ? error.message : 'Internal server error';
  return Response.json({ error: errorMessage }, { status: 500 });
}

export type CreateAppOptions = {
  getRepositories?: (c: Context) => Promise<Repositories>;
  /**
   * Override the secret vault used by the integrations routes. Tests pass
   * an in-memory fake so they don't need a real `QLM_SECRET_VAULT_KEY`
   * and so that assertions can peek at stored values.
   */
  secretVault?: ISecretVault;
  /**
   * Override the integrations provider-driver registry. Tests pass a
   * registry wired with stub drivers so tests never contact real AWS/GCP.
   */
  integrationDriverRegistry?: IIntegrationProviderDriverRegistry;
  /**
   * Override the per-request `accountId` resolver used by the user-tokens
   * routes. Tests inject a stub so they don't need a real Supabase client
   * + `auth.users` row.
   */
  getCurrentAccountId?: (c: Context) => Promise<string | null>;
  /**
   * Sidecar-only: Supabase wrapper for `/auth/sign-in` and `/auth/sign-out`.
   * Tests inject a stub; production wiring lives in story 007's task 003.
   */
  sidecarAuthSupabase?: SidecarAuthSupabase;
};

export function createApp(options?: CreateAppOptions) {
  const getRepos = options?.getRepositories ?? getRepositories;
  const app = new Hono();

  app.use('*', logger());

  app.onError(async (err) => {
    const logger = await getLogger();
    logger.error(
      {
        err,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      'Unhandled request error',
    );
    return handleError(err);
  });

  const password = process.env.QWERY_SERVER_PASSWORD;
  if (password) {
    const username = process.env.QWERY_SERVER_USERNAME ?? 'qwery';
    app.use('*', basicAuth({ username, password }));
  }

  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) return undefined;
        if (origin.startsWith('http://localhost:')) return origin;
        if (origin.startsWith('http://127.0.0.1:')) return origin;
        return origin;
      },
      credentials: true,
    }),
  );

  app.get('/health', (c) => c.json({ status: 'ok' }));

  if (options?.sidecarAuthSupabase) {
    app.route(
      '/auth',
      createAuthRoutes({
        supabase: options.sidecarAuthSupabase,
        keyring: keyringClient,
      }),
    );
  }

  app.all('/mcp', async (c) =>
    handleMcpRequest(c.req.raw, {
      getRepositories: getRepos
        ? (_req) => getRepos(c as unknown as Context)
        : undefined,
    }),
  );

  const api = new Hono();
  api.route('/init', createInitRoutes(getRepos));
  api.route('/organizations', createOrganizationsRoutes(getRepos));
  api.route('/projects', createProjectsRoutes(getRepos));
  api.route('/datasources', createDatasourcesRoutes(getRepos));
  api.route('/driver', createDriverRoutes());
  api.route('/extensions', createExtensionsRoutes());
  api.route(
    '/integrations',
    createIntegrationsRoutes(getRepos, {
      vault: options?.secretVault ?? createServerSecretVault(),
      driverRegistry:
        options?.integrationDriverRegistry ?? createServerDriverRegistry(),
    }),
  );
  api.route('/chat', createChatRoutes(getRepos));
  api.route('/conversations', createConversationsRoutes(getRepos));
  api.route('/messages', createMessagesRoutes(getRepos));
  api.route('/feedback', createFeedbackRoutes(getRepos));
  api.route('/databases', createDatabasesRoutes(getRepos));
  api.route('/nodes', createNodesRoutes(getRepos));
  api.route('/performance-profiles', createPerformanceProfilesRoutes(getRepos));
  api.route('/pools', createPoolsRoutes(getRepos));
  api.route('/notebooks', createNotebooksRoutes(getRepos));
  api.route('/notebook/query', createNotebookQueryRoutes(getRepos));
  api.route('/predictions', createPredictionsRoutes(getRepos));
  api.route('/usage', createUsageRoutes(getRepos));
  api.route(
    '/user-tokens',
    createUserTokensRoutes(getRepos, options?.getCurrentAccountId),
  );
  api.route(
    '/me/preferences',
    createUserPreferencesRoutes(getRepos),
  );
  app.route('/api', api);

  app.get('/api/openapi.json', (c) => c.json(getOpenAPISpec()));
  app.get('/api/docs', (c) => c.html(openApiDocsHtml(getOpenAPISpec())));

  return app;
}

function getOpenAPISpec(): Record<string, unknown> {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Qwery API',
      description:
        'CRUD and heavy APIs for Web UI, Desktop and TUI. Organizations, projects, datasources, conversations, messages, notebooks, usage, chat.',
      version: '0.1.0',
    },
    servers: [{ url: '/', description: 'Current host' }],
    paths: {
      '/api/health': {
        get: {
          summary: 'Health check',
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/init': {
        post: {
          summary: 'Initialize workspace',
          description:
            'Creates default org and project when missing. Does not create notebooks.',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' },
                    organizationId: { type: 'string' },
                    projectId: { type: 'string' },
                    mode: { type: 'string' },
                    runtime: {
                      type: 'string',
                      enum: ['browser', 'desktop', 'mobile'],
                    },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Initialized workspace' } },
        },
      },
      '/api/organizations': {
        get: {
          summary: 'List organizations',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'offset', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'List of organizations' } },
        },
        post: {
          summary: 'Create organization',
          requestBody: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '201': { description: 'Created' } },
        },
      },
      '/api/organizations/search': {
        get: {
          summary: 'Search organizations',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'offset', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'Search results' } },
        },
      },
      '/api/organizations/bulk': {
        post: {
          summary: 'Bulk organizations (delete or export)',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    operation: { type: 'string', enum: ['delete', 'export'] },
                    ids: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Bulk result' } },
        },
      },
      '/api/organizations/{slug}/members': {
        get: {
          summary: 'List organization members',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'List of members' } },
        },
      },
      '/api/organizations/{slug}/members/{userId}/role': {
        patch: {
          summary: 'Update member role',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { role: { type: 'string' } },
                  required: ['role'],
                },
              },
            },
          },
          responses: { '200': { description: 'Updated member' } },
        },
      },
      '/api/organizations/{slug}/members/{userId}': {
        delete: {
          summary: 'Remove member',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'Removed' } },
        },
      },
      '/api/organizations/{id}': {
        get: {
          summary: 'Get organization by id or slug',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'Organization' } },
        },
        put: {
          summary: 'Update organization',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '200': { description: 'Updated' } },
        },
        delete: {
          summary: 'Delete organization',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'Deleted' } },
        },
      },
      '/api/projects': {
        get: {
          summary: 'List projects by organization',
          parameters: [
            {
              name: 'orgId',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'offset', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'List of projects' } },
        },
        post: {
          summary: 'Create project',
          requestBody: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '201': { description: 'Created' } },
        },
      },
      '/api/projects/search': {
        get: {
          summary: 'Search projects',
          parameters: [
            { name: 'orgId', in: 'query', schema: { type: 'string' } },
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'offset', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'Search results' } },
        },
      },
      '/api/projects/bulk': {
        post: {
          summary: 'Bulk projects (delete or export)',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    operation: { type: 'string', enum: ['delete', 'export'] },
                    ids: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Bulk result' } },
        },
      },
      '/api/projects/{id}': {
        get: {
          summary: 'Get project by id or slug',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'Project' } },
        },
        put: {
          summary: 'Update project',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '200': { description: 'Updated' } },
        },
        delete: {
          summary: 'Delete project',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'Deleted' } },
        },
      },
      '/api/datasources': {
        get: {
          summary: 'List datasources by project',
          parameters: [
            {
              name: 'projectId',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'List of datasources' } },
        },
        post: {
          summary: 'Create datasource',
          requestBody: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '201': { description: 'Created' } },
        },
      },
      '/api/datasources/{id}': {
        get: {
          summary: 'Get datasource by id or slug',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'Datasource' } },
        },
        put: {
          summary: 'Update datasource',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '200': { description: 'Updated' } },
        },
        delete: {
          summary: 'Delete datasource',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'Deleted' } },
        },
      },
      '/api/extensions': {
        get: {
          summary: 'List extensions',
          parameters: [
            {
              name: 'scope',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: [
                  'datasource',
                  'driver',
                  'hook',
                  'tool',
                  'agent',
                  'skill',
                ],
              },
              description: 'Filter by extension scope',
            },
          ],
          responses: { '200': { description: 'List of extensions' } },
        },
      },
      '/api/extensions/{id}': {
        get: {
          summary: 'Get extension by id',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Extension identifier',
            },
          ],
          responses: {
            '200': { description: 'Extension definition' },
            '404': { description: 'Extension not found' },
          },
        },
      },
      '/api/conversations': {
        get: {
          summary: 'List conversations',
          responses: { '200': { description: 'List of conversations' } },
        },
        post: {
          summary: 'Create conversation',
          requestBody: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '201': { description: 'Created' } },
        },
      },
      '/api/conversations/project/{projectId}': {
        get: {
          summary: 'List conversations by project',
          parameters: [
            {
              name: 'projectId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'List of conversations' } },
        },
      },
      '/api/conversations/{id}': {
        get: {
          summary: 'Get conversation by id or slug',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'Conversation' } },
        },
        put: {
          summary: 'Update conversation',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '200': { description: 'Updated' } },
        },
        delete: {
          summary: 'Delete conversation',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'Deleted' } },
        },
      },
      '/api/messages': {
        get: {
          summary: 'Get messages by conversation slug',
          parameters: [
            {
              name: 'conversationSlug',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
            { name: 'cursor', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'Messages or paginated result' } },
        },
      },
      '/api/notebooks': {
        get: {
          summary: 'List notebooks',
          parameters: [
            { name: 'projectId', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'List of notebooks' } },
        },
        post: {
          summary: 'Create notebook',
          requestBody: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '201': { description: 'Created' } },
        },
      },
      '/api/notebooks/{id}': {
        get: {
          summary: 'Get notebook by id or slug',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'Notebook' } },
        },
        put: {
          summary: 'Update notebook',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '200': { description: 'Updated' } },
        },
        delete: {
          summary: 'Delete notebook',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'Deleted' } },
        },
      },
      '/api/notebook/query': {
        post: {
          summary: 'Run notebook cell query',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['conversationId', 'query', 'datasourceId'],
                  properties: {
                    conversationId: { type: 'string' },
                    query: { type: 'string' },
                    datasourceId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Query result' },
            '400': { description: 'Bad request' },
            '404': { description: 'Datasource not found' },
          },
        },
      },
      '/api/usage': {
        get: {
          summary: 'Get usage by conversation slug',
          parameters: [
            {
              name: 'conversationSlug',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
            { name: 'userId', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Usage records' } },
        },
        post: {
          summary: 'Create usage',
          requestBody: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '201': { description: 'Created' } },
        },
      },
      '/api/chat/{slug}': {
        post: {
          summary: 'Chat completion (streaming)',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: { '200': { description: 'Streaming response' } },
        },
      },
    },
  };
}

function openApiDocsHtml(spec: Record<string, unknown>): string {
  const specJson = JSON.stringify(spec);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Qwery API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      spec: ${specJson},
      dom_id: '#swagger-ui',
    });
  </script>
</body>
</html>`;
}
