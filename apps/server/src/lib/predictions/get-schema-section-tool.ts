import { z } from 'zod';

import { tool } from '@guepard/agent-factory-sdk';
import type { DatasourceMetadata } from '@guepard/domain/entities';

type TableLike = {
  schema?: string;
  name: string;
  columns?: Array<Record<string, unknown>>;
  primary_keys?: Array<Record<string, unknown>>;
  relationships?: Array<Record<string, unknown>>;
};

function findTable(
  metadata: DatasourceMetadata,
  table: string,
  schema?: string,
): TableLike | null {
  const tables = (metadata.tables ?? []) as TableLike[];

  // Tolerant of qualified names: if the LLM passes "public.drivers",
  // split into schema="public" + name="drivers" and search both ways.
  let effSchema = schema?.toLowerCase();
  let effName = table.toLowerCase();
  if (table.includes('.')) {
    const [maybeSchema, ...rest] = table.split('.');
    if (rest.length > 0 && maybeSchema && rest[0]) {
      effSchema = effSchema ?? maybeSchema.toLowerCase();
      effName = rest.join('.').toLowerCase();
    }
  }

  // 1. Exact (name + schema if given).
  const exact = tables.find(
    (t) =>
      t.name.toLowerCase() === effName &&
      (!effSchema || (t.schema ?? '').toLowerCase() === effSchema),
  );
  if (exact) return exact;

  // 2. Bare-name match across any schema (helpful when the LLM omits
  //    the schema or guesses the wrong one).
  const byName = tables.find((t) => t.name.toLowerCase() === effName);
  if (byName) return byName;

  return null;
}

/**
 * Returns a tool that lets the LLM drill into one table from the
 * pinned snapshot — columns, primary keys, foreign-key relationships.
 *
 * The tool is **snapshot-bound**: it never touches the live datasource.
 * That's the load-bearing reproducibility guarantee from RFC 0030 §5.2 —
 * answers must be stable across snapshot versions.
 */
export function makeGetSchemaSectionTool(metadata: DatasourceMetadata) {
  return tool({
    description:
      'Look up columns, primary keys, and foreign-key relationships for a specific table inside the active snapshot. Use this whenever you need any structural fact beyond the table list.',
    inputSchema: z.object({
      table: z
        .string()
        .min(1)
        .describe('Exact table name as it appears in the snapshot.'),
      schema: z
        .string()
        .optional()
        .describe(
          'Optional schema name. Omit unless the same table name exists in multiple schemas.',
        ),
    }),
    execute: async ({ table, schema }) => {
      const found = findTable(metadata, table, schema);
      if (!found) {
        const known = (metadata.tables ?? [])
          .map((t) => {
            const tt = t as TableLike;
            return tt.schema ? `${tt.schema}.${tt.name}` : tt.name;
          })
          .slice(0, 25)
          .join(', ');
        return {
          found: false,
          error: `Table '${schema ? `${schema}.${table}` : table}' is not in this snapshot.`,
          known_tables_sample: known,
        };
      }
      return {
        found: true,
        schema: found.schema ?? null,
        name: found.name,
        columns: (found.columns ?? []).map((c) => ({
          name:
            (c as { name?: string; column_name?: string }).name ??
            (c as { column_name?: string }).column_name ??
            null,
          type:
            (c as { data_type?: string; type?: string }).data_type ??
            (c as { type?: string }).type ??
            null,
        })),
        primary_keys: (found.primary_keys ?? []).map((pk) => ({
          column:
            (pk as { column_name?: string; name?: string }).column_name ??
            (pk as { name?: string }).name ??
            null,
        })),
        relationships: (found.relationships ?? []).map((rel) => {
          const r = rel as {
            constraint_name?: string;
            source_column_name?: string;
            target_table_name?: string;
            target_column_name?: string;
          };
          return {
            constraint_name: r.constraint_name ?? null,
            source_column: r.source_column_name ?? null,
            target_table: r.target_table_name ?? null,
            target_column: r.target_column_name ?? null,
          };
        }),
      };
    },
  });
}
