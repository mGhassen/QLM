-- @migration-mode: dev-only
-- Story 0026-002 task 1: legacy lifecycle_status sync trigger + pool_view rewrite.
-- Spec §6.1b. Production rollout uses chunked variant (story 003).

set check_function_bodies = off;

-- =====================================================================
-- Function: sync_legacy_status_from_new_fields
-- Trigger:  node_legacy_status_sync (BEFORE INSERT OR UPDATE on public.node)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.sync_legacy_status_from_new_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
      WHEN NEW.lifecycle = 'terminated'                              THEN 'terminating'::public.node_lifecycle_status
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
$function$
;

COMMENT ON FUNCTION public.sync_legacy_status_from_new_fields() IS
  'Projects the legacy public.node.lifecycle_status from the five-axis state. '
  'Read by phase 1 callers only; story 0026-003 drops column + trigger together. RFC 0026 §7.2.';

DROP TRIGGER IF EXISTS node_legacy_status_sync ON public.node;
CREATE TRIGGER node_legacy_status_sync
BEFORE INSERT OR UPDATE ON public.node
FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_status_from_new_fields();

-- =====================================================================
-- Function: touch_node_after_drain_change
-- Trigger:  node_drain_resync_legacy_status (AFTER INS/UPD/DEL on public.node_drain)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.touch_node_after_drain_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  affected_id uuid;
BEGIN
  affected_id := COALESCE(NEW.node_id, OLD.node_id);
  -- No-op UPDATE; the BEFORE trigger on public.node fires and re-projects
  -- lifecycle_status from the now-current drain row.
  UPDATE public.node SET updated_at = now() WHERE id = affected_id;
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

DROP TRIGGER IF EXISTS node_drain_resync_legacy_status ON public.node_drain;
CREATE TRIGGER node_drain_resync_legacy_status
AFTER INSERT OR UPDATE OR DELETE ON public.node_drain
FOR EACH ROW EXECUTE FUNCTION public.touch_node_after_drain_change();

-- =====================================================================
-- pool_view rewrite — adds lifecycle_*_count + health_*_count aggregates.
-- New columns appended at the end (CREATE OR REPLACE VIEW forbids reorder).
-- Health derivation in SQL mirrors deriveNodeHealth (TS).
-- =====================================================================

DROP VIEW IF EXISTS "public"."pool_view";

CREATE VIEW "public"."pool_view"
WITH (security_invoker = true)
AS
WITH node_health AS (
  SELECT
    n_1.id,
    n_1.organization_id,
    n_1.hosting_provider,
    n_1.region,
    n_1.node_pool,
    n_1.cpu,
    n_1.memory,
    n_1.lifecycle,
    n_1.lifecycle_status,
    n_1.is_deleted,
    rs.cpu_util_pct,
    rs.mem_util_pct,
    rs.last_seen_at,
    CASE
      WHEN (rs.last_seen_at IS NULL)                                                                                                                                            THEN 'unknown'::text
      WHEN (n_1.orchestration = ANY (ARRAY['down'::public.node_orchestration_state, 'disconnected'::public.node_orchestration_state]))                                          THEN 'critical'::text
      WHEN ((rs.cpu_util_pct IS NULL) AND (rs.mem_util_pct IS NULL))                                                                                                            THEN 'unknown'::text
      WHEN (((rs.cpu_util_pct IS NOT NULL) AND (rs.cpu_util_pct >= (90)::numeric)) OR ((rs.mem_util_pct IS NOT NULL) AND (rs.mem_util_pct >= (90)::numeric)))                   THEN 'critical'::text
      WHEN (((rs.cpu_util_pct IS NOT NULL) AND (rs.cpu_util_pct >= (70)::numeric)) OR ((rs.mem_util_pct IS NOT NULL) AND (rs.mem_util_pct >= (70)::numeric)))                   THEN 'degraded'::text
      ELSE 'healthy'::text
    END AS health
  FROM (public.node n_1
    LEFT JOIN public.node_runtime_state rs ON ((rs.node_id = n_1.id)))
)
SELECT ((((COALESCE(NULLIF((n.hosting_provider)::text, ''::text), 'unknown'::text) || '::'::text) || COALESCE(NULLIF((n.region)::text, ''::text), 'unknown'::text)) || '::'::text) || COALESCE(NULLIF((n.node_pool)::text, ''::text), '__unclustered__'::text)) AS id,
  n.organization_id,
  COALESCE(NULLIF((n.node_pool)::text, ''::text), '__unclustered__'::text) AS name,
  COALESCE(NULLIF((n.hosting_provider)::text, ''::text), 'unknown'::text) AS provider,
  COALESCE(NULLIF((n.region)::text, ''::text), 'unknown'::text) AS region,
  count(*) AS node_count,
  COALESCE(sum(n.cpu), (0)::bigint) AS total_cpu,
  (COALESCE(sum(n.memory), (0)::bigint))::numeric AS total_memory_gb,
  count(*) FILTER (WHERE (n.lifecycle_status = 'running'::public.node_lifecycle_status)) AS running_count,
  count(*) FILTER (WHERE (n.lifecycle_status = 'draining'::public.node_lifecycle_status)) AS draining_count,
  count(*) FILTER (WHERE (n.lifecycle_status = 'stopped'::public.node_lifecycle_status)) AS stopped_count,
  count(*) FILTER (WHERE (n.lifecycle_status = ANY (ARRAY['error'::public.node_lifecycle_status, 'provisioning'::public.node_lifecycle_status, 'terminating'::public.node_lifecycle_status]))) AS error_count,
  avg(n.cpu_util_pct) FILTER (WHERE (n.cpu_util_pct IS NOT NULL)) AS avg_cpu_util_pct,
  avg(n.mem_util_pct) FILTER (WHERE (n.mem_util_pct IS NOT NULL)) AS avg_mem_util_pct,
  count(*) FILTER (WHERE (n.lifecycle = 'provisioning'::public.node_lifecycle_state)) AS lifecycle_provisioning_count,
  count(*) FILTER (WHERE (n.lifecycle = 'active'::public.node_lifecycle_state)) AS lifecycle_active_count,
  count(*) FILTER (WHERE (n.lifecycle = 'stopping'::public.node_lifecycle_state)) AS lifecycle_stopping_count,
  count(*) FILTER (WHERE (n.lifecycle = 'stopped'::public.node_lifecycle_state)) AS lifecycle_stopped_count,
  count(*) FILTER (WHERE (n.lifecycle = 'terminating'::public.node_lifecycle_state)) AS lifecycle_terminating_count,
  count(*) FILTER (WHERE (n.lifecycle = 'terminated'::public.node_lifecycle_state)) AS lifecycle_terminated_count,
  count(*) FILTER (WHERE (n.health = 'healthy'::text)) AS health_healthy_count,
  count(*) FILTER (WHERE (n.health = 'degraded'::text)) AS health_degraded_count,
  count(*) FILTER (WHERE (n.health = 'critical'::text)) AS health_critical_count,
  count(*) FILTER (WHERE (n.health = 'unknown'::text)) AS health_unknown_count
FROM node_health n
WHERE ((n.organization_id IS NOT NULL) AND (n.is_deleted = false))
GROUP BY
  n.organization_id,
  COALESCE(NULLIF((n.hosting_provider)::text, ''::text), 'unknown'::text),
  COALESCE(NULLIF((n.region)::text, ''::text), 'unknown'::text),
  COALESCE(NULLIF((n.node_pool)::text, ''::text), '__unclustered__'::text);
