import { z } from 'zod';

import {
  NODE_HEALTH,
  NODE_LIFECYCLE_STATES,
  NODE_PROVIDERS,
  NODE_REGIONS,
  type NodeHealth,
  type NodeLifecycleState,
  type NodeRegion,
} from './node.type';

/**
 * Sentinel value used in the synthetic Pool id and name when a node has
 * no `node_pool` value. Mirrors the legacy `nc:unclustered` token.
 */
export const POOL_UNCLUSTERED_NAME = '__unclustered__';

/**
 * Provider field accepts the four real providers plus `'unknown'` for
 * nodes that registered without a hosting_provider value (legacy data
 * or self-hosted clusters that haven't reported their cloud).
 */
export const PoolProviderSchema = z.union([
  z.enum(NODE_PROVIDERS),
  z.literal('unknown'),
]);
export type PoolProvider = z.infer<typeof PoolProviderSchema>;

/**
 * Lifecycle-axis counts (operator intent). One entry per
 * `NodeLifecycleState`. RFC 0026 §5.
 */
export const PoolLifecycleCountsSchema = z.object({
  provisioning: z.number().int().nonnegative().default(0),
  active: z.number().int().nonnegative().default(0),
  stopping: z.number().int().nonnegative().default(0),
  stopped: z.number().int().nonnegative().default(0),
  terminating: z.number().int().nonnegative().default(0),
  terminated: z.number().int().nonnegative().default(0),
}) satisfies z.ZodType<Record<NodeLifecycleState, number>>;
export type PoolLifecycleCounts = z.infer<typeof PoolLifecycleCountsSchema>;

/**
 * Health-axis counts (derived). One entry per `NodeHealth`. The SQL
 * view computes these via the same threshold expressions as
 * `deriveNodeHealth`. RFC 0026 §5.5.
 */
export const PoolHealthCountsSchema = z.object({
  healthy: z.number().int().nonnegative().default(0),
  degraded: z.number().int().nonnegative().default(0),
  critical: z.number().int().nonnegative().default(0),
  unknown: z.number().int().nonnegative().default(0),
}) satisfies z.ZodType<Record<NodeHealth, number>>;
export type PoolHealthCounts = z.infer<typeof PoolHealthCountsSchema>;

/**
 * A logical placement boundary — Nomad's NodePool concept.
 *
 * Phase 1 ships pools as a read-only Postgres VIEW (`public.pool_view`)
 * over `public.node`. Phase 2 may promote to a writable `public.pool`
 * table once product confirms metadata needs (description, owner,
 * capacity-min). The repository port is shaped to accept either backing.
 *
 * The synthetic `id` is `${provider}::${region}::${name}` — stable
 * across reloads because the SQL view emits the same composite key.
 *
 * `projectId` carries the organization id per the existing migration
 * convention (see `packages/repositories/supabase/src/node.repository.ts`,
 * which documents `projectId holds org ID`). Pools are org-scoped — the
 * field is named `projectId` to match the rest of the domain layer.
 */
export const PoolSchema = z.object({
  id: z.string().min(1).describe('Synthetic id: provider::region::name'),
  projectId: z.string().min(1).describe('Owning organization id'),
  name: z.string().min(1).describe('node_pool value or "__unclustered__"'),
  provider: PoolProviderSchema,
  region: z.enum(NODE_REGIONS),
  nodeCount: z.number().int().nonnegative(),
  totalCpu: z.number().int().nonnegative(),
  totalMemoryGb: z.number().nonnegative(),
  lifecycleCounts: PoolLifecycleCountsSchema,
  healthCounts: PoolHealthCountsSchema,
  avgCpuUtilPct: z.number().min(0).max(100).optional(),
  avgMemUtilPct: z.number().min(0).max(100).optional(),
});

export type Pool = z.infer<typeof PoolSchema>;

/**
 * Compose a stable Pool id from its identifying triple. Adapters call
 * this so the synthetic id matches what the SQL view emits.
 */
export function poolIdOf(
  provider: PoolProvider,
  region: NodeRegion | string,
  name: string,
): string {
  return `${provider}::${region}::${name}`;
}

export const POOL_COUNTED_LIFECYCLES: readonly NodeLifecycleState[] =
  NODE_LIFECYCLE_STATES;

export const POOL_COUNTED_HEALTH: readonly NodeHealth[] = NODE_HEALTH;
