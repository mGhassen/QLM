import { z } from 'zod';

import {
  NODE_ELIGIBILITY_STATES,
  NODE_HEALTH,
  NODE_LIFECYCLE_STATES,
  NODE_PROVIDERS,
  type NodeEligibility,
  type NodeHealth,
  type NodeLifecycleState,
  type NodeProvider,
} from '@qlm/domain/entities';
import type { FilterRule } from '@qlm/ui/data-table-advanced';
import { arrayOf, decodeFilters, encodeFilters } from '@qlm/ui/filter-serde';

export { decodeFilters, encodeFilters };

/**
 * Pure URL (de)serialisation for the nodes view state. Lives outside
 * `use-nodes-view-state.ts` so unit tests can exercise the serde without
 * bootstrapping TanStack Router.
 */

export const nodesSearchSchema = z.object({
  q: z.string().optional(),
  lifecycle: arrayOf(z.enum(NODE_LIFECYCLE_STATES)),
  eligibility: arrayOf(z.enum(NODE_ELIGIBILITY_STATES)),
  region: arrayOf(z.string()),
  provider: arrayOf(z.enum(NODE_PROVIDERS)),
  /** One or more cluster names to filter by. */
  cluster: arrayOf(z.string()),
  /** When present, filters to nodes with no cluster assigned. */
  nocl: z.coerce.boolean().optional(),
  /** Health-axis filter — `critical`, `degraded`, `healthy`, `unknown`. */
  health: arrayOf(z.enum(NODE_HEALTH)),
  page: z.number().int().nonnegative().optional(),
  selected: arrayOf(z.string()),
  /** Base64(JSON) of the full FilterRule[] for complex rules. */
  f: z.string().optional(),
});

export type NodesSearchParams = z.infer<typeof nodesSearchSchema>;

export function parseNodesSearch(raw: unknown): NodesSearchParams {
  const parsed = nodesSearchSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

export type NodesViewState = {
  filters: FilterRule[];
  pageIndex: number;
  search: string;
  selection: Set<string>;
};

export function urlToViewState(raw: unknown): NodesViewState {
  const params = parseNodesSearch(raw);

  const decoded = decodeFilters(params.f);
  const filters: FilterRule[] =
    decoded && decoded.length > 0
      ? decoded
      : [
          ...(params.lifecycle?.length
            ? [
                {
                  id: 'url_lifecycle',
                  field: 'lifecycle',
                  operator: 'in' as const,
                  value: params.lifecycle as NodeLifecycleState[],
                },
              ]
            : []),
          ...(params.eligibility?.length
            ? [
                {
                  id: 'url_eligibility',
                  field: 'eligibility',
                  operator: 'in' as const,
                  value: params.eligibility as NodeEligibility[],
                },
              ]
            : []),
          ...(params.region?.length
            ? [
                {
                  id: 'url_region',
                  field: 'region',
                  operator: 'in' as const,
                  value: params.region as string[],
                },
              ]
            : []),
          ...(params.provider?.length
            ? [
                {
                  id: 'url_provider',
                  field: 'provider',
                  operator: 'in' as const,
                  value: params.provider as NodeProvider[],
                },
              ]
            : []),
          ...(params.cluster?.length
            ? [
                {
                  id: 'url_cluster',
                  field: 'cluster',
                  operator: 'in' as const,
                  value: params.cluster,
                },
              ]
            : []),
          ...(params.nocl
            ? [
                {
                  id: 'url_nocl',
                  field: 'cluster',
                  operator: 'isEmpty' as const,
                  value: null,
                },
              ]
            : []),
          ...(params.health?.length
            ? [
                {
                  id: 'url_health',
                  field: 'health',
                  operator: 'in' as const,
                  value: params.health as NodeHealth[],
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
 * returns a new record with empty / undefined values stripped so the
 * URL stays tight.
 */
export function mergeSearch(
  prev: Record<string, unknown>,
  patch: Partial<NodesSearchParams>,
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
