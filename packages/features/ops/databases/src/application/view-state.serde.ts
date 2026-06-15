import { z } from 'zod';

import {
  DATABASE_PROVIDERS,
  DATABASE_STATUSES,
  type DatabaseProvider,
  type DatabaseStatus,
} from '@qlm/domain/entities';
import type { FilterRule } from '@qlm/ui/data-table-advanced';
import { arrayOf, decodeFilters, encodeFilters } from '@qlm/ui/filter-serde';

export { decodeFilters, encodeFilters };

/**
 * Pure URL (de)serialisation for the databases view state. Lives outside
 * `use-view-state.ts` so unit tests can exercise the serde without
 * bootstrapping TanStack Router.
 */

export const databasesSearchSchema = z.object({
  q: z.string().optional(),
  status: arrayOf(z.enum(DATABASE_STATUSES)),
  provider: arrayOf(z.enum(DATABASE_PROVIDERS)),
  page: z.number().int().nonnegative().optional(),
  selected: arrayOf(z.string()),
  /** Base64(JSON) of the full FilterRule[] for complex rules. */
  f: z.string().optional(),
});

export type DatabasesSearchParams = z.infer<typeof databasesSearchSchema>;

export function parseDatabasesSearch(raw: unknown): DatabasesSearchParams {
  const parsed = databasesSearchSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

export type DatabasesViewState = {
  filters: FilterRule[];
  pageIndex: number;
  search: string;
  selection: Set<string>;
};

export function urlToViewState(raw: unknown): DatabasesViewState {
  const params = parseDatabasesSearch(raw);

  const decoded = decodeFilters(params.f);
  const filters: FilterRule[] =
    decoded && decoded.length > 0
      ? decoded
      : [
          ...(params.status?.length
            ? [
                {
                  id: 'url_status',
                  field: 'status',
                  operator: 'in' as const,
                  value: params.status as DatabaseStatus[],
                },
              ]
            : []),
          ...(params.provider?.length
            ? [
                {
                  id: 'url_provider',
                  field: 'provider',
                  operator: 'in' as const,
                  value: params.provider as DatabaseProvider[],
                },
              ]
            : []),
        ];

  return {
    filters,
    pageIndex: params.page ?? 0,
    search: params.q ?? '',
    selection: new Set(params.selected ?? []),
  };
}

/**
 * Merge-and-clean helper for URL writers. Accepts a partial patch and
 * returns a new record with empty / undefined values stripped so the URL
 * stays tight. Preserves unknown keys (e.g. `db`, `tid`) by spreading
 * `prev` first.
 */
export function mergeSearch(
  prev: Record<string, unknown>,
  patch: Partial<DatabasesSearchParams>,
): Record<string, unknown> {
  const merged = { ...prev, ...patch };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'string' && v === '') continue;
    out[k] = v;
  }
  return out;
}
