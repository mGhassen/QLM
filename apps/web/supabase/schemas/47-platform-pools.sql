/*
 * -------------------------------------------------------
 * Section: Platform pools (read-only aggregation view)
 *
 * Pool = (organization_id, hosting_provider, region, node_pool).
 * RFC 0025 phase 1 ships pools as a SQL VIEW over public.node so the
 * domain layer has a real Pool entity without requiring a writable
 * table. RLS on public.node flows through via security_invoker.
 *
 * Phase 2 may promote to public.pool with metadata columns; the
 * IPoolRepository port is shaped to accept either backing.
 * -------------------------------------------------------
 */

-- Synthetic id format: `<provider>::<region>::<name>`
-- The name is `node_pool` value or '__unclustered__' when the column is null.
-- Provider falls back to 'unknown' when hosting_provider is null.

CREATE OR REPLACE VIEW public.pool_view
WITH (security_invoker = true) AS
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
    COUNT(*) FILTER (WHERE n.lifecycle_status = 'running')::bigint                                                  AS running_count,
    COUNT(*) FILTER (WHERE n.lifecycle_status = 'draining')::bigint                                                 AS draining_count,
    COUNT(*) FILTER (WHERE n.lifecycle_status = 'stopped')::bigint                                                  AS stopped_count,
    COUNT(*) FILTER (WHERE n.lifecycle_status IN ('error', 'provisioning', 'terminating'))::bigint                  AS error_count,
    AVG(rs.cpu_util_pct) FILTER (WHERE rs.cpu_util_pct IS NOT NULL)::numeric                                        AS avg_cpu_util_pct,
    AVG(rs.mem_util_pct) FILTER (WHERE rs.mem_util_pct IS NOT NULL)::numeric                                        AS avg_mem_util_pct
FROM public.node n
LEFT JOIN public.node_runtime_state rs ON rs.node_id = n.id
WHERE n.organization_id IS NOT NULL
  AND n.is_deleted = false
GROUP BY
    n.organization_id,
    COALESCE(NULLIF(n.hosting_provider::text, ''), 'unknown'),
    COALESCE(NULLIF(n.region, ''), 'unknown'),
    COALESCE(NULLIF(n.node_pool, ''), '__unclustered__');

-- The phase 2 rewrite of pool_view (lifecycle/health aggregations) lives in
-- schema 49 — it must run AFTER schema 48 adds the lifecycle/orchestration
-- columns to public.node. Schema files are applied alphanumerically, so 47
-- intentionally only ships the legacy shape.

COMMENT ON VIEW public.pool_view IS
  'Read-only pool aggregation grouped by (org, provider, region, node_pool). '
  'RLS inherits from public.node + public.node_runtime_state via security_invoker.';

-- Composite index on grouping keys to avoid sort-aggregation on large fleets.
CREATE INDEX IF NOT EXISTS idx_node_pool_grouping
  ON public.node (organization_id, node_pool, hosting_provider, region)
  WHERE organization_id IS NOT NULL AND is_deleted = false;
