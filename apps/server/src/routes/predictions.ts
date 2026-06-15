import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';

import { stepCountIs, streamText } from '@guepard/agent-factory-sdk';
import { Provider } from '@guepard/agent-factory-sdk/llm';
import { makeGetSchemaSectionTool } from '../lib/predictions/get-schema-section-tool';
import { makeRunQueryTool } from '../lib/predictions/run-query-tool';
import type { Repositories } from '@guepard/domain/repositories';
import {
  AppendAgentMessageService,
  CreateAgentConversationService,
  GetSnapshotByIdService,
  ListAgentMessagesService,
  ListSnapshotsByDatasourceService,
  TakeSnapshotService,
} from '@guepard/domain/services';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@guepard/extensions-sdk';
import { getDriverInstance } from '@guepard/extensions-loader';
import { DatasourceMetadataZodSchema } from '@guepard/domain/entities';

import { handleDomainException } from '../lib/http-utils';
import { buildSystemPrompt } from '../lib/predictions/build-system-prompt';
import { getCurrentUserId } from '../lib/current-account';

const fromClientBodySchema = z.object({
  metadata: DatasourceMetadataZodSchema,
});

const createConversationBodySchema = z.object({
  snapshotId: z.string().uuid(),
});

const sendMessageBodySchema = z.object({
  content: z.string().min(1).max(8000),
});

const BROWSER_RUNTIME_ONLY = 'browser_runtime_only';

/** Compose two AbortSignals into one. Aborts when either source aborts. */
function anyAbort(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (a.aborted) return a;
  if (b.aborted) return b;
  const ctrl = new AbortController();
  const onA = () => ctrl.abort(a.reason);
  const onB = () => ctrl.abort(b.reason);
  a.addEventListener('abort', onA, { once: true });
  b.addEventListener('abort', onB, { once: true });
  return ctrl.signal;
}

export function createPredictionsRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  // POST /api/predictions/datasources/:id/snapshots
  // Server-fetched: resolves the driver and calls metadata() server-side.
  // For browser-runtime drivers, returns 422 so the client can fallback.
  app.post('/datasources/:id/snapshots', async (c) => {
    try {
      const datasourceId = c.req.param('id');
      const userId = await getCurrentUserId(c);
      if (!userId) return c.json({ error: 'Unauthenticated' }, 401);
      const repos = await getRepositories(c);
      const datasource = await repos.datasource.findById(datasourceId);
      if (!datasource) return c.json({ error: 'Datasource not found' }, 404);

      const extension = ExtensionsRegistry.get<DatasourceExtension>(
        datasource.datasource_provider,
      );
      if (!extension) {
        return c.json({ error: 'Datasource extension not registered' }, 404);
      }
      const driver =
        extension.drivers?.find((d) => d.id === datasource.datasource_driver) ??
        extension.drivers?.[0];
      if (!driver) {
        return c.json({ error: 'No driver registered for datasource' }, 404);
      }
      if (driver.runtime !== 'node') {
        return c.json({ error: BROWSER_RUNTIME_ONLY }, 422);
      }

      const instance = await getDriverInstance(driver, {
        config: (datasource.config ?? {}) as Record<string, unknown>,
      });
      const metadata = await instance.metadata();

      const snapshot = await new TakeSnapshotService(
        repos.predictionSchemaSnapshot,
      ).execute({
        datasourceId,
        projectId: datasource.projectId,
        takenBy: userId,
        metadata,
      });
      return c.json(snapshot, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // POST /api/predictions/datasources/:id/snapshots/from-client
  app.post(
    '/datasources/:id/snapshots/from-client',
    zValidator('json', fromClientBodySchema),
    async (c) => {
      try {
        const datasourceId = c.req.param('id');
        const userId = await getCurrentUserId(c);
        if (!userId) return c.json({ error: 'Unauthenticated' }, 401);
        const { metadata } = c.req.valid('json');
        const repos = await getRepositories(c);
        const datasource = await repos.datasource.findById(datasourceId);
        if (!datasource) return c.json({ error: 'Datasource not found' }, 404);

        const snapshot = await new TakeSnapshotService(
          repos.predictionSchemaSnapshot,
        ).execute({
          datasourceId,
          projectId: datasource.projectId,
          takenBy: userId,
          metadata,
        });
        return c.json(snapshot, 201);
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  // GET /api/predictions/datasources/:id/snapshots
  app.get('/datasources/:id/snapshots', async (c) => {
    try {
      const datasourceId = c.req.param('id');
      const repos = await getRepositories(c);
      const list = await new ListSnapshotsByDatasourceService(
        repos.predictionSchemaSnapshot,
      ).execute({ datasourceId });
      return c.json(list);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // GET /api/predictions/datasources/:id/snapshots/latest
  app.get('/datasources/:id/snapshots/latest', async (c) => {
    try {
      const datasourceId = c.req.param('id');
      const repos = await getRepositories(c);
      const latest =
        await repos.predictionSchemaSnapshot.findLatestByDatasource(
          datasourceId,
        );
      return c.json(latest ?? null);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // GET /api/predictions/snapshots/:id
  app.get('/snapshots/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const repos = await getRepositories(c);
      const snapshot = await new GetSnapshotByIdService(
        repos.predictionSchemaSnapshot,
      ).execute({ id });
      return c.json(snapshot);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // POST /api/predictions/conversations  body: { snapshotId }
  app.post(
    '/conversations',
    zValidator('json', createConversationBodySchema),
    async (c) => {
      try {
        const { snapshotId } = c.req.valid('json');
        const userId = await getCurrentUserId(c);
        if (!userId) return c.json({ error: 'Unauthenticated' }, 401);
        const repos = await getRepositories(c);
        const snapshot =
          await repos.predictionSchemaSnapshot.findById(snapshotId);
        if (!snapshot) return c.json({ error: 'Snapshot not found' }, 404);
        const conv = await new CreateAgentConversationService(
          repos.predictionAgentConversation,
          repos.predictionSchemaSnapshot,
        ).execute({
          snapshotId,
          projectId: snapshot.projectId,
          createdBy: userId,
        });
        return c.json(conv, 201);
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  // GET /api/predictions/conversations/:id
  app.get('/conversations/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const repos = await getRepositories(c);
      const conv = await repos.predictionAgentConversation.findById(id);
      if (!conv) return c.json({ error: 'Conversation not found' }, 404);
      return c.json(conv);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // GET /api/predictions/snapshots/:id/conversations
  app.get('/snapshots/:id/conversations', async (c) => {
    try {
      const id = c.req.param('id');
      const repos = await getRepositories(c);
      const list = await repos.predictionAgentConversation.listBySnapshot(id);
      return c.json(list);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // GET /api/predictions/conversations/:id/messages
  app.get('/conversations/:id/messages', async (c) => {
    try {
      const conversationId = c.req.param('id');
      const repos = await getRepositories(c);
      const list = await new ListAgentMessagesService(
        repos.predictionAgentMessage,
      ).execute({ conversationId });
      return c.json(list);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // POST /api/predictions/conversations/:id/messages
  // Sends a user message and streams the assistant response back. Both
  // the user and assistant messages are persisted server-side.
  app.post(
    '/conversations/:id/messages',
    zValidator('json', sendMessageBodySchema),
    async (c) => {
      try {
        const conversationId = c.req.param('id');
        const { content } = c.req.valid('json');
        const repos = await getRepositories(c);

        const conversation =
          await repos.predictionAgentConversation.findById(conversationId);
        if (!conversation) {
          return c.json({ error: 'Conversation not found' }, 404);
        }
        const snapshot = await repos.predictionSchemaSnapshot.findById(
          conversation.snapshotId,
        );
        if (!snapshot) {
          return c.json({ error: 'Snapshot not found' }, 404);
        }
        const datasource = await repos.datasource.findById(
          snapshot.datasourceId,
        );
        const datasourceName = datasource?.name ?? 'datasource';

        // Persist user message + load history before streaming.
        await new AppendAgentMessageService(
          repos.predictionAgentMessage,
          repos.predictionAgentConversation,
        ).execute({ conversationId, role: 'user', content });

        const history =
          await repos.predictionAgentMessage.listByConversation(conversationId);

        const system = buildSystemPrompt({
          metadata: snapshot.metadata,
          datasourceName,
        });

        const modelMessages = history
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        // Wall-clock guard: combine client disconnect with a 90s ceiling
        // so a wedged tool call can't keep the LLM loop running forever.
        const wallClock = new AbortController();
        const wallClockTimer = setTimeout(() => wallClock.abort(), 90_000);
        const composedSignal = anyAbort(c.req.raw.signal, wallClock.signal);

        const model = await Provider.getLanguage(Provider.getDefaultModel());
        const result = streamText({
          model,
          system,
          messages: modelMessages,
          // Two bound tools:
          //   - getSchemaSection: snapshot-bound, structural drilldown.
          //   - runQuery: read-only SELECT against the live datasource the
          //     snapshot was taken from. Required for live facts the
          //     snapshot doesn't capture (row counts, sizes, sample rows).
          tools: {
            getSchemaSection: makeGetSchemaSectionTool(snapshot.metadata),
            runQuery: makeRunQueryTool(snapshot.datasourceId, repos),
          },
          // Multi-step loop. 10 steps gives room for: 2 schema
          // lookups + 3 runQuery attempts (with self-correction on
          // empty/error results) + final text + a couple of buffers.
          // The system prompt also caps the agent at 3 runQuery
          // attempts to prevent the empty-result spin loop.
          stopWhen: stepCountIs(10),
          // Abort on client disconnect or 90s wall-clock ceiling.
          abortSignal: composedSignal,
          onError: ({ error }) => {
            console.error('[predictions/agent] streamText error:', error);
          },
          onStepFinish: ({ toolCalls, toolResults, finishReason }) => {
            console.log('[predictions/agent] step finished', {
              tools: toolCalls?.map((t) => t.toolName),
              hasResults: (toolResults?.length ?? 0) > 0,
              finishReason,
            });
          },
        });

        // Build a custom response stream. Reading `result.fullStream`
        // gives us tool-call / tool-result events, not just text — we
        // surface those as inline status markers so the user sees
        // progress while the agent is mid-loop. Without this, the
        // browser stares at a silent stream for 30-60s during tool calls.
        const encoder = new TextEncoder();
        let assistantText = '';
        const responseStream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const part of result.fullStream) {
                switch (part.type) {
                  case 'text-delta': {
                    const delta = (part as { text?: string }).text ?? '';
                    if (delta) {
                      assistantText += delta;
                      controller.enqueue(encoder.encode(delta));
                    }
                    break;
                  }
                  case 'tool-call': {
                    // Progress markers are wrapped in zero-width
                    // delimiters so the client can render them as
                    // dim/separate from the answer text.
                    const name = (part as { toolName?: string }).toolName;
                    const args = (part as { input?: Record<string, unknown> })
                      .input;
                    let detail = '';
                    if (
                      name === 'runQuery' &&
                      args &&
                      typeof args === 'object'
                    ) {
                      const q = (args as { query?: string }).query ?? '';
                      detail = ` ${q.replace(/\s+/g, ' ').slice(0, 140)}${q.length > 140 ? '…' : ''}`;
                    } else if (
                      name === 'getSchemaSection' &&
                      args &&
                      typeof args === 'object'
                    ) {
                      const table = (args as { table?: string }).table ?? '';
                      detail = ` ${table}`;
                    }
                    controller.enqueue(
                      encoder.encode(
                        `\u200b[trace] → ${name}${detail}\n\u200b`,
                      ),
                    );
                    break;
                  }
                  case 'tool-result': {
                    const name = (part as { toolName?: string }).toolName;
                    const out = (part as { output?: Record<string, unknown> })
                      .output;
                    let line = `✓ ${name}`;
                    if (out && typeof out === 'object') {
                      if ('error' in out && out.error) {
                        line = `⚠ ${name}: ${String(out.error)}`;
                      } else if (
                        'rowCount' in out &&
                        typeof out.rowCount === 'number'
                      ) {
                        const rc = out.rowCount;
                        line =
                          rc === 0
                            ? `⚠ ${name} — 0 rows (try a different shape)`
                            : `✓ ${name} — ${rc} rows`;
                      } else if ('found' in out && out.found === false) {
                        line = `⚠ ${name}: not found`;
                      }
                    }
                    controller.enqueue(
                      encoder.encode(`\u200b[trace] ${line}\n\u200b`),
                    );
                    break;
                  }
                  case 'error': {
                    const err = (part as { error?: unknown }).error;
                    const msg =
                      err instanceof Error ? err.message : String(err);
                    controller.enqueue(
                      encoder.encode(`\u200b[trace] ✗ ${msg}\n\u200b`),
                    );
                    break;
                  }
                  default:
                    break;
                }
              }
              controller.close();
            } catch (error) {
              const msg =
                error instanceof Error ? error.message : String(error);
              controller.enqueue(encoder.encode(`\n\n_❌ ${msg}_\n`));
              controller.close();
            } finally {
              clearTimeout(wallClockTimer);
              if (assistantText.trim().length > 0) {
                try {
                  await new AppendAgentMessageService(
                    repos.predictionAgentMessage,
                    repos.predictionAgentConversation,
                  ).execute({
                    conversationId,
                    role: 'assistant',
                    content: assistantText,
                  });
                } catch (persistError) {
                  console.warn(
                    '[predictions/agent] failed to persist assistant message',
                    persistError,
                  );
                }
              }
            }
          },
        });

        return new Response(responseStream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  return app;
}
