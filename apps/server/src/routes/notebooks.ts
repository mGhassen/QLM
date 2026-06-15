import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';

import { stepCountIs, streamText } from '@guepard/agent-factory-sdk';
import { Provider } from '@guepard/agent-factory-sdk/llm';
import {
  CreateNotebookService,
  DeleteNotebookService,
  GetNotebookBySlugService,
  GetNotebookService,
  GetNotebooksByProjectIdService,
  UpdateNotebookService,
} from '@guepard/domain/services';
import type { Repositories } from '@guepard/domain/repositories';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@guepard/extensions-sdk';
import { getDriverInstance } from '@guepard/extensions-loader';

import { handleDomainException, isUUID } from '../lib/http-utils';
import { makeSqlAgentTools } from '../lib/notebooks/sql-agent-tools';

const generateSqlBody = z.object({
  datasourceId: z.string().uuid(),
  prompt: z.string().min(1).max(4000),
});

/**
 * Compact schema digest fed to the SQL-generation LLM. Only structural
 * facts the model needs to write a syntactically valid query for the
 * target dialect — table names, column names + types, primary keys,
 * foreign-key relationships. Pulled live from the driver since the
 * notebook isn't snapshot-pinned the way Predictions is.
 */
function buildSchemaDigest(metadata: {
  tables?: Array<{
    schema?: string;
    name: string;
    primary_keys?: Array<{ column_name?: string; name?: string } | unknown>;
    relationships?: Array<{
      source_column_name?: string;
      target_table_name?: string;
      target_column_name?: string;
    }>;
    columns?: Array<{ name?: string; data_type?: string; type?: string }>;
  }>;
}): string {
  const tables = metadata.tables ?? [];
  if (tables.length === 0) return '(datasource exposes no tables)';
  return tables
    .map((t) => {
      const fq = t.schema ? `${t.schema}.${t.name}` : t.name;
      const cols = (t.columns ?? [])
        .map(
          (c) =>
            `    ${c.name ?? '?'} ${
              c.data_type ?? (c as { type?: string }).type ?? '?'
            }`,
        )
        .join('\n');
      const pks =
        t.primary_keys && t.primary_keys.length > 0
          ? `  PK: ${t.primary_keys
              .map((pk) => {
                const x = pk as { column_name?: string; name?: string };
                return x.column_name ?? x.name ?? '?';
              })
              .join(', ')}`
          : '';
      const fks =
        t.relationships && t.relationships.length > 0
          ? `  FK:\n${t.relationships
              .map(
                (r) =>
                  `    ${r.source_column_name} → ${r.target_table_name}.${r.target_column_name}`,
              )
              .join('\n')}`
          : '';
      return [`Table: ${fq}`, '  Columns:', cols, pks, fks]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

const listQuerySchema = z.object({
  projectId: z.string().optional(),
});

const createBodySchema = z
  .object({
    projectId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    createdBy: z.string().optional(),
    userId: z.string().optional(),
  })
  .passthrough();

const updateBodySchema = z
  .object({
    projectId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    cells: z.array(z.record(z.string(), z.unknown())).optional(),
    datasources: z.array(z.string()).optional(),
  })
  .passthrough();

const idParamSchema = z.object({ id: z.string().min(1) });

export function createNotebooksRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', zValidator('query', listQuerySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const { projectId } = c.req.valid('query');

      if (projectId) {
        const useCase = new GetNotebooksByProjectIdService(repos.notebook);
        const notebooks = await useCase.execute(projectId);
        return c.json(notebooks ?? []);
      }

      const notebooks = await repos.notebook.findAll();
      return c.json(notebooks);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/', zValidator('json', createBodySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const body = c.req.valid('json');
      const useCase = new CreateNotebookService(repos.notebook);
      const notebook = await useCase.execute(body);

      try {
        const notebookTitle = `Notebook - ${notebook.id}`;
        const existingConversations = await repos.conversation.findByProjectId(
          notebook.projectId,
        );
        const existingConversation = existingConversations.find(
          (conv) => conv.title === notebookTitle,
        );

        if (!existingConversation) {
          const notebookWithCreatedBy = notebook as { createdBy?: string };
          const userId =
            notebookWithCreatedBy.createdBy ??
            (body as { createdBy?: string }).createdBy ??
            (body as { userId?: string }).userId ??
            'system';

          await repos.conversation.create({
            id: crypto.randomUUID(),
            slug: '',
            title: notebookTitle,
            projectId: notebook.projectId,
            taskId: crypto.randomUUID(),
            datasources: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: userId,
            updatedBy: userId,
            isPublic: false,
            seedMessage: '',
          });
        }
      } catch {
        // Do not fail notebook creation if conversation creation fails
      }

      return c.json(notebook, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/:id', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');
      const repos = await getRepositories(c);
      const useCase = isUUID(id)
        ? new GetNotebookService(repos.notebook)
        : new GetNotebookBySlugService(repos.notebook);
      const notebook = await useCase.execute(id);
      return c.json(notebook);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.put(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('json', updateBodySchema),
    async (c) => {
      try {
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        const repos = await getRepositories(c);
        const useCase = new UpdateNotebookService(repos.notebook);
        const notebook = await useCase.execute({ ...body, id });
        return c.json(notebook);
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  app.delete('/:id', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');
      const repos = await getRepositories(c);
      const useCase = new DeleteNotebookService(repos.notebook);
      await useCase.execute(id);
      return c.json({ success: true });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // POST /api/notebooks/generate-sql
  // Natural language → SQL via the same multi-step agent pattern the
  // qwery chat uses (streamText + tools + stopWhen). The agent has two
  // bound tools to probe the schema and validate drafts:
  //
  //   inspectSchema(focus_table?)  → detailed schema for one or all tables
  //   probeQuery({ query, reason }) → run a read-only SELECT (≤50 rows,
  //                                    10s) to verify column names and
  //                                    that a draft query returns rows
  //
  // Up to 6 steps per turn — room for: 1 inspect + 2 probes + 1
  // self-correction + final answer. The final assistant text is the SQL.
  //
  // The response streams every event (text-delta, tool-call, tool-result)
  // via `[trace] …` lines wrapped in zero-width delimiters so the
  // notebook popup renders progress live, exactly like Predictions does.
  app.post('/generate-sql', zValidator('json', generateSqlBody), async (c) => {
    try {
      const { datasourceId, prompt } = c.req.valid('json');
      const repos = await getRepositories(c);
      const datasource = await repos.datasource.findById(datasourceId);
      if (!datasource) {
        return c.json({ error: 'Datasource not found' }, 404);
      }

      const extension = ExtensionsRegistry.get<DatasourceExtension>(
        datasource.datasource_provider,
      );
      const driver =
        extension?.drivers?.find(
          (d) => d.id === datasource.datasource_driver,
        ) ?? extension?.drivers?.[0];
      if (!driver || driver.runtime !== 'node') {
        return c.json(
          { error: 'No server-side driver available for this datasource' },
          422,
        );
      }

      const instance = await getDriverInstance(driver, {
        config: (datasource.config ?? {}) as Record<string, unknown>,
      });
      const metadata = await instance.metadata();
      if (typeof instance.close === 'function') {
        try {
          await instance.close();
        } catch {
          // best-effort
        }
      }

      const dialect =
        datasource.datasource_provider === 'mysql'
          ? 'MySQL'
          : datasource.datasource_provider === 'clickhouse'
            ? 'ClickHouse'
            : datasource.datasource_provider === 'mongodb'
              ? 'MongoDB'
              : datasource.datasource_provider === 'duckdb'
                ? 'DuckDB'
                : 'PostgreSQL';

      const system = [
        `You are a ${dialect} SQL author embedded in a notebook cell. Your output replaces the cell's query.`,
        '',
        'You have two tools to verify your SQL BEFORE committing it:',
        '  - inspectSchema(focus_table?) — exact column names + types + PKs + FKs for any table',
        '  - probeQuery({ query, reason }) — run a read-only SELECT (≤50 rows, 10s) to verify column existence or test your draft query',
        '',
        'Hard rules — non-negotiable:',
        '1. Use the tools when needed. Do NOT give up with a "cannot generate" comment without first calling inspectSchema for the relevant tables AND probeQuery to test at least one draft query.',
        '2. Your FINAL response is the SQL only. No markdown fences, no prose, no "Here is the SQL:". Just the statement.',
        '3. Reference real tables and columns. Quote identifiers that contain uppercase letters or special characters.',
        '4. JOIN foreign keys whenever the user asks for human-readable values (names, titles) rather than raw ids.',
        '5. Shape by intent:',
        '   - "all the X" / "list X" → plain SELECT with sensible columns',
        '   - "how many" / "count" → SELECT COUNT(*) FROM …',
        '   - "who/which X with the most Y" → SELECT … COUNT(*) AS n FROM … GROUP BY … ORDER BY n DESC LIMIT 1',
        '   - "average/sum/min/max" → use the aggregate directly',
        '6. ONLY if after using BOTH tools you confirm the data genuinely cannot answer the request, return a single SQL comment line: `-- cannot generate: <specific reason based on what the tools showed>`.',
        '',
        `Compact schema summary (${datasource.name}):`,
        buildSchemaDigest(metadata as Parameters<typeof buildSchemaDigest>[0]),
      ].join('\n');

      const model = await Provider.getLanguage(Provider.getDefaultModel());
      const result = streamText({
        model,
        system,
        prompt,
        tools: makeSqlAgentTools(datasource),
        // 10 steps: matches the Predictions agent budget. With 6 the
        // model routinely spent its whole budget on inspect/probe calls
        // and never reached a final text response, leaving the client
        // with only [trace] lines that strip down to an empty string.
        stopWhen: stepCountIs(10),
        abortSignal: c.req.raw.signal,
        onError: ({ error }) => {
          console.error('[notebooks/generate-sql] streamText error:', error);
        },
        onStepFinish: ({ toolCalls, toolResults, finishReason, text }) => {
          console.log('[notebooks/generate-sql] step finished', {
            tools: toolCalls?.map((t) => t.toolName),
            hasResults: (toolResults?.length ?? 0) > 0,
            textLen: typeof text === 'string' ? text.length : 0,
            finishReason,
          });
        },
      });

      const encoder = new TextEncoder();
      // Track the final SQL text we sent down the wire so we can detect
      // the "model finished without emitting any text-delta" failure mode
      // and fall back to a meaningful comment instead of letting the
      // client throw "agent returned an empty SQL response".
      let emittedText = '';
      let sawError: string | null = null;
      const responseStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const part of result.fullStream) {
              switch (part.type) {
                case 'text-delta': {
                  const delta = (part as { text?: string }).text ?? '';
                  if (delta) {
                    emittedText += delta;
                    controller.enqueue(encoder.encode(delta));
                  }
                  break;
                }
                case 'tool-call': {
                  const name = (part as { toolName?: string }).toolName;
                  const args = (part as { input?: Record<string, unknown> })
                    .input;
                  let detail = '';
                  if (
                    name === 'probeQuery' &&
                    args &&
                    typeof args === 'object'
                  ) {
                    const q = (args as { query?: string }).query ?? '';
                    detail = ` ${q.replace(/\s+/g, ' ').slice(0, 100)}${q.length > 100 ? '…' : ''}`;
                  } else if (
                    name === 'inspectSchema' &&
                    args &&
                    typeof args === 'object'
                  ) {
                    const t = (args as { focus_table?: string }).focus_table;
                    detail = t ? ` ${t}` : ' (full schema)';
                  }
                  controller.enqueue(
                    encoder.encode(`\u200b[trace] → ${name}${detail}\n\u200b`),
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
                      line = `✓ ${name} — ${out.rowCount} rows`;
                    } else if (
                      'tables' in out &&
                      Array.isArray((out as { tables?: unknown[] }).tables)
                    ) {
                      const len = (out as { tables: unknown[] }).tables.length;
                      line = `✓ ${name} — ${len} tables`;
                    }
                  }
                  controller.enqueue(
                    encoder.encode(`\u200b[trace] ${line}\n\u200b`),
                  );
                  break;
                }
                case 'error': {
                  const err = (part as { error?: unknown }).error;
                  const msg = err instanceof Error ? err.message : String(err);
                  sawError = msg;
                  controller.enqueue(
                    encoder.encode(`\u200b[trace] ✗ ${msg}\n\u200b`),
                  );
                  break;
                }
                default:
                  break;
              }
            }

            // Fallback. If the iterator finished without ever emitting a
            // text-delta, the cell would receive only [trace] lines and
            // strip down to an empty string. Detect this and emit a
            // SQL-shaped comment so the user sees the failure mode in
            // the cell itself (vs. a generic toast). result.text is the
            // canonical final assistant text and resolves once the
            // stream is fully drained — by this point it is ready.
            if (emittedText.trim().length === 0) {
              let canonicalText = '';
              let finishReason: string | undefined;
              try {
                canonicalText = (await result.text) ?? '';
              } catch {
                // already surfaced as `error` part above
              }
              try {
                finishReason = await result.finishReason;
              } catch {
                /* ignore */
              }
              if (canonicalText.trim().length > 0) {
                controller.enqueue(encoder.encode(canonicalText));
              } else {
                const reason = sawError
                  ? sawError
                  : finishReason === 'tool-calls'
                    ? 'agent exhausted its tool budget before producing SQL — try a more focused question or attach a smaller schema'
                    : finishReason === 'length'
                      ? 'agent hit the output length limit before producing SQL'
                      : finishReason === 'content-filter'
                        ? 'agent response was blocked by the content filter'
                        : `agent finished without producing SQL (finishReason=${finishReason ?? 'unknown'})`;
                controller.enqueue(
                  encoder.encode(`-- cannot generate: ${reason}\n`),
                );
              }
            }

            controller.close();
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);

            console.error('[notebooks/generate-sql] stream loop threw:', error);
            controller.enqueue(
              encoder.encode(`\u200b[trace] ✗ ${msg}\n\u200b`),
            );
            // Also emit a SQL-shaped error so the client always lands on
            // *some* parseable SQL instead of "empty response".
            if (emittedText.trim().length === 0) {
              controller.enqueue(
                encoder.encode(`-- cannot generate: ${msg}\n`),
              );
            }
            controller.close();
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
  });

  return app;
}
