import { z } from 'zod';

import { tool } from '@guepard/agent-factory-sdk';
import type { Datasource } from '@guepard/domain/entities';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
  type IDataSourceDriver,
} from '@guepard/extensions-sdk';
import { getDriverInstance } from '@guepard/extensions-loader';
import { getLogger } from '@guepard/shared/logger';

// Same SELECT-only guardrail used by the Predictions runQuery tool.
const ALLOWED_LEADING =
  /^(?:--[^\n]*\n|\/\*[\s\S]*?\*\/|\s)*(select|with|show|explain)\b/i;
const DESTRUCTIVE =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|merge|call|copy|vacuum|cluster|reindex|comment|lock|set\s+session|set\s+local)\b/i;

const MAX_ROWS = 50;
const QUERY_TIMEOUT_MS = 10_000;

function assertReadOnly(sql: string): void {
  if (!ALLOWED_LEADING.test(sql)) {
    throw new Error(
      'Only SELECT / WITH / SHOW / EXPLAIN statements are allowed.',
    );
  }
  const stripped = sql
    .replace(/--[^\n]*\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""');
  if (DESTRUCTIVE.test(stripped)) {
    throw new Error('Destructive keywords are not allowed.');
  }
}

/**
 * Acquire the node-runtime driver for a datasource, run the callback,
 * then close. The instance is single-use to avoid keeping connections
 * open across tool calls (the AI may issue many in a single agent turn).
 */
async function withDriver<T>(
  datasource: Datasource,
  fn: (instance: IDataSourceDriver) => Promise<T>,
): Promise<T> {
  const extension = ExtensionsRegistry.get<DatasourceExtension>(
    datasource.datasource_provider,
  );
  const driver =
    extension?.drivers?.find((d) => d.id === datasource.datasource_driver) ??
    extension?.drivers?.[0];
  if (!driver || driver.runtime !== 'node') {
    throw new Error('No node-runtime driver available for this datasource.');
  }
  const instance = await getDriverInstance(driver, {
    config: (datasource.config ?? {}) as Record<string, unknown>,
  });
  try {
    return await fn(instance);
  } finally {
    if (typeof instance.close === 'function') {
      try {
        await instance.close();
      } catch {
        // best-effort
      }
    }
  }
}

/**
 * Tools the SQL-generation agent calls during its turn. Mirrors the
 * qwery chat's getSchema/runQuery pair but is bound to a SPECIFIC
 * datasource at construction time — the LLM cannot pick a different
 * datasource via tool arguments, removing an entire attack surface.
 */
export function makeSqlAgentTools(datasource: Datasource) {
  return {
    /**
     * Inspect the schema in detail. The system prompt already includes a
     * compact summary, but the agent calls this when it needs precise
     * column types / FK relationships before drafting SQL.
     */
    inspectSchema: tool({
      description:
        'Return detailed schema info for the bound datasource: every table, every column with type, primary keys, foreign-key relationships. Call this once if the compact summary in the system prompt is missing detail you need.',
      inputSchema: z.object({
        focus_table: z
          .string()
          .optional()
          .describe(
            'Optional table name to focus on. Omit to get the full schema.',
          ),
      }),
      execute: async ({ focus_table }) => {
        return await withDriver(datasource, async (instance) => {
          const metadata = await instance.metadata();
          const tables = (metadata.tables ?? []) as Array<{
            schema?: string;
            name: string;
            columns?: Array<{ name?: string; data_type?: string }>;
            primary_keys?: Array<{ column_name?: string; name?: string }>;
            relationships?: Array<{
              source_column_name?: string;
              target_table_name?: string;
              target_column_name?: string;
            }>;
          }>;
          const filtered = focus_table
            ? tables.filter(
                (t) => t.name.toLowerCase() === focus_table.toLowerCase(),
              )
            : tables;
          return {
            ok: true,
            tables: filtered.map((t) => ({
              schema: t.schema ?? null,
              name: t.name,
              columns: (t.columns ?? []).map((c) => ({
                name: c.name ?? null,
                type: c.data_type ?? null,
              })),
              primary_keys: (t.primary_keys ?? []).map(
                (pk) => pk.column_name ?? pk.name ?? null,
              ),
              foreign_keys: (t.relationships ?? []).map((r) => ({
                from: r.source_column_name ?? null,
                to_table: r.target_table_name ?? null,
                to_column: r.target_column_name ?? null,
              })),
            })),
          };
        });
      },
    }),

    /**
     * Run a SELECT to probe the data. The agent uses this to verify
     * column names exist, sample values, or test that a draft query
     * actually returns rows before committing it to the cell.
     *
     * Row cap is intentionally low (50) — the agent only needs to peek.
     */
    probeQuery: tool({
      description: [
        'Run a read-only SELECT (or WITH/SHOW/EXPLAIN) against the bound datasource.',
        `Returns up to ${MAX_ROWS} rows.`,
        'Use to: verify column names exist, sample values, check that a draft SQL returns rows, or fix an error from a previous attempt.',
        'Do NOT use this as the final answer — it is for probing only. The user wants the SQL written to the cell.',
      ].join(' '),
      inputSchema: z.object({
        query: z.string().min(1).describe('A read-only SQL statement.'),
        reason: z
          .string()
          .min(1)
          .describe(
            'One short sentence on why you are probing (e.g. "verify drivers.full_name exists").',
          ),
      }),
      execute: async ({ query, reason }) => {
        const logger = await getLogger();
        try {
          assertReadOnly(query);
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }

        const startedAt = performance.now();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Probe query exceeded the 10s timeout.')),
            QUERY_TIMEOUT_MS,
          ),
        );

        try {
          logger.debug?.(
            {
              datasourceId: datasource.id,
              queryPreview: query.slice(0, 120),
              reason,
            },
            '[notebooks/probe] executing',
          );
          const result = (await withDriver(datasource, async (instance) =>
            Promise.race([instance.query(query), timeoutPromise]),
          )) as { columns: unknown[]; rows: Array<Record<string, unknown>> };

          const columnNames = (result.columns ?? []).map((col) =>
            typeof col === 'string'
              ? col
              : ((col as { name?: string }).name ?? String(col)),
          );
          const truncated = (result.rows ?? []).slice(0, MAX_ROWS);
          const tookMs = Math.round(performance.now() - startedAt);
          return {
            ok: true,
            columns: columnNames,
            rows: truncated,
            rowCount: truncated.length,
            tookMs,
          };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),
  };
}
