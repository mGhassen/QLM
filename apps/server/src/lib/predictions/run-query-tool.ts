import { z } from 'zod';

import { tool } from '@guepard/agent-factory-sdk';
import type { Repositories } from '@guepard/domain/repositories';
import {
  ExtensionsRegistry,
  type DatasourceExtension,
} from '@guepard/extensions-sdk';
import { getDriverInstance } from '@guepard/extensions-loader';
import { getLogger } from '@guepard/shared/logger';

// Heuristic SELECT-only guardrail. Rejects any statement whose first
// non-comment, non-whitespace token isn't SELECT/WITH/SHOW/EXPLAIN, and
// rejects any statement containing a destructive keyword. Real protection
// still relies on the datasource credential being scoped read-only — this
// is a best-effort layer for LLM-generated SQL.
const ALLOWED_LEADING =
  /^(?:--[^\n]*\n|\/\*[\s\S]*?\*\/|\s)*(select|with|show|explain)\b/i;
const DESTRUCTIVE =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|merge|call|copy|vacuum|cluster|reindex|comment|lock|set\s+session|set\s+local)\b/i;

const MAX_ROWS = 200;
const QUERY_TIMEOUT_MS = 15_000;

function assertReadOnly(sql: string): void {
  if (!ALLOWED_LEADING.test(sql)) {
    throw new Error(
      'Only SELECT / WITH / SHOW / EXPLAIN statements are allowed.',
    );
  }
  // Strip strings + comments before checking for destructive verbs to avoid
  // false positives on things like SELECT 'drop the bass'.
  const stripped = sql
    .replace(/--[^\n]*\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""');
  if (DESTRUCTIVE.test(stripped)) {
    throw new Error(
      'Destructive keywords are not allowed (insert/update/delete/drop/alter/create/truncate/grant/revoke).',
    );
  }
}

/**
 * Returns a tool that runs a read-only SQL statement against the
 * datasource the active snapshot was taken from.
 *
 * The tool is **bound to one datasource** at construction time — the
 * LLM cannot pick a different datasource. Reads use the existing
 * extension driver, which inherits whatever credential the user
 * configured for the datasource (so RLS / read-only roles still apply
 * at the DB layer).
 */
export function makeRunQueryTool(
  datasourceId: string,
  repositories: Repositories,
) {
  return tool({
    description: [
      'Run a read-only SQL query against the datasource the active snapshot is from.',
      `Only SELECT/WITH/SHOW/EXPLAIN are allowed. Results are capped at ${MAX_ROWS} rows.`,
      'Use this for row counts, table sizes, column distributions, sample rows, or any analytic question that needs live data.',
      'Always reference real tables and columns (use `getSchemaSection` first if unsure).',
    ].join(' '),
    inputSchema: z.object({
      query: z.string().min(1).describe('A read-only SQL statement.'),
      reason: z
        .string()
        .min(1)
        .describe('One short sentence on why you are running this query.'),
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

      const datasource = await repositories.datasource.findById(datasourceId);
      if (!datasource) {
        return { ok: false, error: 'Datasource not found' };
      }
      const extension = ExtensionsRegistry.get<DatasourceExtension>(
        datasource.datasource_provider,
      );
      const driver =
        extension?.drivers?.find(
          (d) => d.id === datasource.datasource_driver,
        ) ?? extension?.drivers?.[0];
      if (!driver || driver.runtime !== 'node') {
        return {
          ok: false,
          error:
            'No node-runtime driver available for this datasource on the server.',
        };
      }

      const instance = await getDriverInstance(driver, {
        config: (datasource.config ?? {}) as Record<string, unknown>,
      });

      const startedAt = performance.now();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Query exceeded the 15s timeout.')),
          QUERY_TIMEOUT_MS,
        ),
      );

      try {
        logger.debug?.(
          { datasourceId, queryPreview: query.slice(0, 120), reason },
          '[predictions/runQuery] executing',
        );
        const result = (await Promise.race([
          instance.query(query),
          timeoutPromise,
        ])) as { columns: unknown[]; rows: Array<Record<string, unknown>> };

        const columnNames = (result.columns ?? []).map((col) =>
          typeof col === 'string'
            ? col
            : ((col as { name?: string }).name ?? String(col)),
        );
        const truncated = (result.rows ?? []).slice(0, MAX_ROWS);
        const tookMs = Math.round(performance.now() - startedAt);
        const rowCount = truncated.length;
        // Help the LLM react sensibly when a query returns nothing —
        // most "0 rows" results come from over-restrictive WHERE
        // clauses, wrong columns, or NULL-heavy data. Without a hint
        // the model tends to retry with the same shape.
        const emptyHint =
          rowCount === 0
            ? 'Query returned no rows. Likely causes: column does not exist, WHERE filter is too narrow, JOIN keys mismatch, or values are NULL. Inspect the snapshot schema before retrying with a different shape — do not retry the same query.'
            : null;
        return {
          ok: true,
          columns: columnNames,
          rows: truncated,
          rowCount,
          truncated:
            (result.rows ?? []).length > MAX_ROWS
              ? `result truncated to first ${MAX_ROWS} rows`
              : null,
          tookMs,
          ...(emptyHint ? { hint: emptyHint } : {}),
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      } finally {
        if (typeof instance.close === 'function') {
          try {
            await instance.close();
          } catch {
            // Closing best-effort; never block the agent on cleanup failure.
          }
        }
      }
    },
  });
}
