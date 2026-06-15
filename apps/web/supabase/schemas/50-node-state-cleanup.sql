/*
 * -------------------------------------------------------
 * Section: Node state cleanup (phase 2 story 0026-005)
 *
 * Drops the legacy `lifecycle_status` projection. Five-axis state
 * (lifecycle / orchestration / eligibility / drain / health) shipped
 * across stories 0026-001 through 0026-004; no application code reads
 * the old enum/column anymore. RFC 0026 §6.5 / §7.5.
 *
 * Atomic ordering matters:
 *   1. DROP VIEW pool_view             — depends on lifecycle_status
 *   2. DROP TRIGGER + FUNCTION         — sync function references column + enum
 *   3. ALTER TABLE DROP COLUMN         — needs the trigger gone first
 *   4. DROP TYPE                       — needs the column gone first
 *   5. CREATE VIEW pool_view (no legacy columns)
 *
 * Local-only `/finish` flow lands all of this in one apply. Production
 * rollout (RFC §7.5) requires deploying the code-side prune (stories
 * 003 + 004) first, verifying logs/error rates, then running this
 * migration in a follow-up window.
 *
 * Manual rollback (irreversible at scale; for an emergency revert window
 * before reads cut over):
 *   1. CREATE TYPE public.node_lifecycle_status AS ENUM
 *        ('provisioning','running','draining','stopped','terminating','error');
 *   2. ALTER TABLE public.node ADD COLUMN lifecycle_status
 *        public.node_lifecycle_status;
 *   3. Repopulate by re-applying the CASE block from schema 49
 *      (`sync_legacy_status_from_new_fields`).
 *   4. Recreate the trigger + sync function.
 *   5. Recreate `pool_view` with the legacy *_count columns.
 *   6. The reverse path drops the `node_drain` table — back it up first
 *      if any drain-state needs to survive the rollback.
 * -------------------------------------------------------
 */

-- 1. Drop pool_view first — its column list still mentions lifecycle_status
--    via the legacy `running_count` / `draining_count` / `stopped_count` /
--    `error_count` filters. CREATE OR REPLACE VIEW cannot drop columns;
--    requires a full DROP + CREATE. RESTRICT is explicit (it is also the
--    default) — fail loudly if any other view, materialized view, or FDW
--    depends on `pool_view` so we don't silently cascade-drop them.
DROP VIEW IF EXISTS public.pool_view RESTRICT;

-- 2. Drop the legacy projection triggers + functions. The drain re-sync
--    trigger + fn are unused once the projection is gone.
DROP TRIGGER IF EXISTS node_legacy_status_sync ON public.node;
DROP TRIGGER IF EXISTS node_drain_resync_legacy_status ON public.node_drain;

DROP FUNCTION IF EXISTS public.sync_legacy_status_from_new_fields();
DROP FUNCTION IF EXISTS public.touch_node_after_drain_change();

-- 3. Drop the legacy lifecycle_status column.
ALTER TABLE public.node DROP COLUMN IF EXISTS lifecycle_status;

-- 4. Drop the legacy enum type.
DROP TYPE IF EXISTS public.node_lifecycle_status;

-- 5. Recreate pool_view without the legacy *_count columns. The five-axis
--    aggregations (lifecycle_*_count + health_*_count) and the existing
--    avg_*_util_pct columns remain. Health derivation in SQL mirrors
--    `deriveNodeHealth` (TS) — see
--    `packages/domain/src/services/node/derive-health.ts`. Thresholds 70/90
--    are the literal values from `HEALTH_THRESHOLDS`. CI parity test asserts
--    the constants stay in sync. Spec §5.5.
CREATE VIEW public.pool_view
WITH (security_invoker = true) AS
WITH node_health AS (
  SELECT
    n.id,
    n.organization_id,
    n.hosting_provider,
    n.region,
    n.node_pool,
    n.cpu,
    n.memory,
    n.lifecycle,
    n.is_deleted,
    rs.cpu_util_pct,
    rs.mem_util_pct,
    rs.last_seen_at,
    CASE
      WHEN rs.last_seen_at IS NULL                                                              THEN 'unknown'
      WHEN n.orchestration IN ('down', 'disconnected')                                          THEN 'critical'
      WHEN rs.cpu_util_pct IS NULL AND rs.mem_util_pct IS NULL                                  THEN 'unknown'
      WHEN (rs.cpu_util_pct IS NOT NULL AND rs.cpu_util_pct >= 90)
        OR (rs.mem_util_pct IS NOT NULL AND rs.mem_util_pct >= 90)                              THEN 'critical'
      WHEN (rs.cpu_util_pct IS NOT NULL AND rs.cpu_util_pct >= 70)
        OR (rs.mem_util_pct IS NOT NULL AND rs.mem_util_pct >= 70)                              THEN 'degraded'
      ELSE 'healthy'
    END AS health
  FROM public.node n
  LEFT JOIN public.node_runtime_state rs ON rs.node_id = n.id
)
SELECT
    COALESCE(NULLIF(n.hosting_provider::text, ''), 'unknown')
      || '::' || COALESCE(NULLIF(n.region, ''), 'unknown')
      || '::' || COALESCE(NULLIF(n.node_pool, ''), '__unclustered__')                                              AS id,
    n.organization_id                                                                                              AS organization_id,
    COALESCE(NULLIF(n.node_pool, ''), '__unclustered__')                                                           AS name,
    COALESCE(NULLIF(n.hosting_provider::text, ''), 'unknown')                                                      AS provider,
    COALESCE(NULLIF(n.region, ''), 'unknown')                                                                      AS region,
    COUNT(*)::bigint                                                                                                AS node_count,
    COALESCE(SUM(n.cpu), 0)::bigint                                                                                 AS total_cpu,
    COALESCE(SUM(n.memory), 0)::numeric                                                                             AS total_memory_gb,
    AVG(n.cpu_util_pct) FILTER (WHERE n.cpu_util_pct IS NOT NULL)::numeric                                          AS avg_cpu_util_pct,
    AVG(n.mem_util_pct) FILTER (WHERE n.mem_util_pct IS NOT NULL)::numeric                                          AS avg_mem_util_pct,
    -- Lifecycle-axis counts (operator intent):
    COUNT(*) FILTER (WHERE n.lifecycle = 'provisioning')::bigint                                                    AS lifecycle_provisioning_count,
    COUNT(*) FILTER (WHERE n.lifecycle = 'active')::bigint                                                          AS lifecycle_active_count,
    COUNT(*) FILTER (WHERE n.lifecycle = 'stopping')::bigint                                                        AS lifecycle_stopping_count,
    COUNT(*) FILTER (WHERE n.lifecycle = 'stopped')::bigint                                                         AS lifecycle_stopped_count,
    COUNT(*) FILTER (WHERE n.lifecycle = 'terminating')::bigint                                                     AS lifecycle_terminating_count,
    COUNT(*) FILTER (WHERE n.lifecycle = 'terminated')::bigint                                                      AS lifecycle_terminated_count,
    -- Health-axis counts (derived — TS↔SQL parity):
    COUNT(*) FILTER (WHERE n.health = 'healthy')::bigint                                                            AS health_healthy_count,
    COUNT(*) FILTER (WHERE n.health = 'degraded')::bigint                                                           AS health_degraded_count,
    COUNT(*) FILTER (WHERE n.health = 'critical')::bigint                                                           AS health_critical_count,
    COUNT(*) FILTER (WHERE n.health = 'unknown')::bigint                                                            AS health_unknown_count
FROM node_health n
WHERE n.organization_id IS NOT NULL
  AND n.is_deleted = false
GROUP BY
    n.organization_id,
    COALESCE(NULLIF(n.hosting_provider::text, ''), 'unknown'),
    COALESCE(NULLIF(n.region, ''), 'unknown'),
    COALESCE(NULLIF(n.node_pool, ''), '__unclustered__');
