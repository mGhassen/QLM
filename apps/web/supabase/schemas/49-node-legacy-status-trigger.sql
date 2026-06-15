/*
 * -------------------------------------------------------
 * Section: Legacy lifecycle_status sync trigger (phase 2 story 0026-002)
 *
 * `public.node.lifecycle_status` is now a *projection* of the new
 * five-axis state — application code writes the new fields and the
 * trigger reads them to keep the legacy column consistent. This lets
 * us cut over readers gradually; story 0026-003 drops the column +
 * trigger together.
 *
 * Precedence is deterministic, terminal-lifecycle-first. Spec §6.1b /
 * RFC §7.2.
 * -------------------------------------------------------
 */

CREATE OR REPLACE FUNCTION public.sync_legacy_status_from_new_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  drain_active boolean;
BEGIN
  SELECT COALESCE(active, false) INTO drain_active
  FROM public.node_drain WHERE node_id = NEW.id;

  -- INSERT path or rows with no drain row yet → drain_active = false.
  IF drain_active IS NULL THEN
    drain_active := false;
  END IF;

  NEW.lifecycle_status :=
    CASE
      -- `terminated` is the post-terminate end-state; project to the
      -- closest legacy bucket (`stopped`) rather than re-using
      -- `terminating` which represents in-flight termination.
      WHEN NEW.lifecycle = 'terminated'                              THEN 'stopped'::public.node_lifecycle_status
      WHEN NEW.lifecycle = 'terminating'                             THEN 'terminating'::public.node_lifecycle_status
      WHEN drain_active                                              THEN 'draining'::public.node_lifecycle_status
      WHEN NEW.orchestration IN ('down', 'disconnected')             THEN 'stopped'::public.node_lifecycle_status
      WHEN NEW.lifecycle = 'stopped'                                 THEN 'stopped'::public.node_lifecycle_status
      WHEN NEW.lifecycle = 'stopping'                                THEN 'draining'::public.node_lifecycle_status
      WHEN NEW.lifecycle = 'active' AND NEW.orchestration = 'ready'  THEN 'running'::public.node_lifecycle_status
      WHEN NEW.lifecycle = 'provisioning'                            THEN 'provisioning'::public.node_lifecycle_status
      ELSE 'provisioning'::public.node_lifecycle_status
    END;

  RETURN NEW;
END;
$$;

-- Fires on every UPDATE because the drain re-sync trigger touches `updated_at`
-- to force re-projection — narrowing to `OF lifecycle, orchestration` would
-- miss drain-induced re-syncs.
DROP TRIGGER IF EXISTS node_legacy_status_sync ON public.node;
CREATE TRIGGER node_legacy_status_sync
BEFORE INSERT OR UPDATE ON public.node
FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_status_from_new_fields();

COMMENT ON FUNCTION public.sync_legacy_status_from_new_fields() IS
  'Projects the legacy public.node.lifecycle_status from the five-axis state. '
  'Read by phase 1 callers only; story 0026-003 drops column + trigger together. RFC 0026 §7.2.';

-- =====================================================================
-- node_drain → re-sync trigger
--
-- Drain start/cancel mutates `public.node_drain` rather than `public.node`.
-- The legacy projection still depends on `drain.active`, so the sub-table
-- needs its own trigger that re-fires the sync function on the parent row.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.touch_node_after_drain_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  affected_id uuid;
BEGIN
  affected_id := COALESCE(NEW.node_id, OLD.node_id);
  -- No-op UPDATE; the BEFORE trigger on public.node fires and re-projects
  -- lifecycle_status from the now-current drain row.
  UPDATE public.node SET updated_at = now() WHERE id = affected_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS node_drain_resync_legacy_status ON public.node_drain;
CREATE TRIGGER node_drain_resync_legacy_status
AFTER INSERT OR UPDATE OR DELETE ON public.node_drain
FOR EACH ROW EXECUTE FUNCTION public.touch_node_after_drain_change();

-- =====================================================================
-- pool_view rewrite — adds lifecycle_*_count + health_*_count aggregates.
--
-- Lives in schema 49 (after 48 adds the lifecycle/orchestration columns)
-- because schemas are applied alphanumerically and 47 ran before those
-- columns existed. The legacy `running_count` / `draining_count` /
-- `stopped_count` / `error_count` columns stay one transition release —
-- story 0026-003 drops them together with the legacy `lifecycle_status`
-- column they project from.
--
-- Health derivation in SQL mirrors `deriveNodeHealth` (TS) — see
-- `packages/domain/src/services/node/derive-health.ts`. Thresholds 70/90
-- are the literal values from `HEALTH_THRESHOLDS`. CI parity test asserts
-- the constants stay in sync. Spec §5.5 / §6.1b.
-- =====================================================================

CREATE OR REPLACE VIEW public.pool_view
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
    n.lifecycle_status,
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
    -- Existing column order preserved (CREATE OR REPLACE VIEW forbids reorder).
    -- Legacy *_count columns — story 0026-003 drops:
    COUNT(*) FILTER (WHERE n.lifecycle_status = 'running')::bigint                                                  AS running_count,
    COUNT(*) FILTER (WHERE n.lifecycle_status = 'draining')::bigint                                                 AS draining_count,
    COUNT(*) FILTER (WHERE n.lifecycle_status = 'stopped')::bigint                                                  AS stopped_count,
    COUNT(*) FILTER (WHERE n.lifecycle_status IN ('error', 'provisioning', 'terminating'))::bigint                  AS error_count,
    AVG(n.cpu_util_pct) FILTER (WHERE n.cpu_util_pct IS NOT NULL)::numeric                                          AS avg_cpu_util_pct,
    AVG(n.mem_util_pct) FILTER (WHERE n.mem_util_pct IS NOT NULL)::numeric                                          AS avg_mem_util_pct,
    -- New columns appended at end (CREATE OR REPLACE VIEW only allows appends).
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
