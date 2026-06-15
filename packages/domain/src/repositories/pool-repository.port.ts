import type { Pool } from '../entities/pool.type';

/**
 * Read-only access to the pool aggregation. Backed by the
 * `public.pool_view` Postgres VIEW in phase 1; will swap to a real
 * `public.pool` table in phase 2 if product confirms metadata needs.
 *
 * Pools are org-scoped because nodes live on `public.node` keyed by
 * `organization_id`. Callers pass the organization id via the same
 * `projectId`-named field used elsewhere in the domain layer (see
 * `packages/repositories/supabase/src/node.repository.ts` — the field
 * carries the org id by migration convention).
 */
export abstract class IPoolRepository {
  public abstract findByOrganizationId(organizationId: string): Promise<Pool[]>;
}
