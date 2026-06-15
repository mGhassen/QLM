-- Platform pools — read-only aggregation VIEW over public.node.
-- See `apps/web/supabase/schemas/46-platform-pools.sql` for the canonical definition.

CREATE INDEX IF NOT EXISTS idx_node_pool_grouping
  ON public.node (organization_id, node_pool, hosting_provider, region)
  WHERE organization_id IS NOT NULL AND is_deleted = false;

CREATE OR REPLACE VIEW public.pool_view
WITH (security_invoker = true) AS
SELECT
    COALESCE(NULLIF(n.hosting_provider::text, ''), 'unknown')
      || '::' || COALESCE(NULLIF(n.region, ''), 'unknown')
      || '::' || COALESCE(NULLIF(n.node_pool, ''), '__unclustered__')                        AS id,
    n.organization_id                                                                        AS organization_id,
    COALESCE(NULLIF(n.node_pool, ''), '__unclustered__')                                     AS name,
    COALESCE(NULLIF(n.hosting_provider::text, ''), 'unknown')                                AS provider,
    COALESCE(NULLIF(n.region, ''), 'unknown')                                                AS region,
    COUNT(*)::bigint                                                                          AS node_count,
    COALESCE(SUM(n.cpu), 0)::bigint                                                           AS total_cpu,
    COALESCE(SUM(n.memory), 0)::numeric                                                       AS total_memory_gb,
    COUNT(*) FILTER (WHERE n.lifecycle_status = 'running')::bigint                            AS running_count,
    COUNT(*) FILTER (WHERE n.lifecycle_status = 'draining')::bigint                           AS draining_count,
    COUNT(*) FILTER (WHERE n.lifecycle_status = 'stopped')::bigint                            AS stopped_count,
    COUNT(*) FILTER (
      WHERE n.lifecycle_status IN ('error', 'provisioning', 'terminating')
    )::bigint                                                                                 AS error_count,
    AVG(rs.cpu_util_pct) FILTER (WHERE rs.cpu_util_pct IS NOT NULL)::numeric                  AS avg_cpu_util_pct,
    AVG(rs.mem_util_pct) FILTER (WHERE rs.mem_util_pct IS NOT NULL)::numeric                  AS avg_mem_util_pct
FROM public.node n
LEFT JOIN public.node_runtime_state rs ON rs.node_id = n.id
WHERE n.organization_id IS NOT NULL
  AND n.is_deleted = false
GROUP BY
    n.organization_id,
    COALESCE(NULLIF(n.hosting_provider::text, ''), 'unknown'),
    COALESCE(NULLIF(n.region, ''), 'unknown'),
    COALESCE(NULLIF(n.node_pool, ''), '__unclustered__');

COMMENT ON VIEW public.pool_view IS
  'Read-only pool aggregation grouped by (org, provider, region, node_pool). '
  'RLS inherits from public.node + public.node_runtime_state via security_invoker.';
