-- RFC 0026 §6.5 — drop the legacy lifecycle_status projection.
-- Source of truth: apps/web/supabase/schemas/49-node-state-cleanup.sql.
-- Generator (`supabase db diff`) emitted ~70 extra lines of unrelated
-- constraint cycles + revoke/grant noise on data_clone / data_snapshot /
-- db_role / deployment_request / node_runtime_state — all no-op
-- (drop+identical-re-add). Pruned for hygiene; behavior unchanged.

drop trigger if exists "node_legacy_status_sync" on "public"."node";
drop trigger if exists "node_drain_resync_legacy_status" on "public"."node_drain";

drop function if exists "public"."sync_legacy_status_from_new_fields"();
drop function if exists "public"."touch_node_after_drain_change"();

drop view if exists "public"."pool_view";

drop index if exists "public"."idx_node_lifecycle_status";

alter table "public"."node" drop column "lifecycle_status";

drop type "public"."node_lifecycle_status";

create or replace view "public"."pool_view" as  WITH node_health AS (
         SELECT n_1.id,
            n_1.organization_id,
            n_1.hosting_provider,
            n_1.region,
            n_1.node_pool,
            n_1.cpu,
            n_1.memory,
            n_1.lifecycle,
            n_1.is_deleted,
            rs.cpu_util_pct,
            rs.mem_util_pct,
            rs.last_seen_at,
                CASE
                    WHEN (rs.last_seen_at IS NULL) THEN 'unknown'::text
                    WHEN (n_1.orchestration = ANY (ARRAY['down'::public.node_orchestration_state, 'disconnected'::public.node_orchestration_state])) THEN 'critical'::text
                    WHEN ((rs.cpu_util_pct IS NULL) AND (rs.mem_util_pct IS NULL)) THEN 'unknown'::text
                    WHEN (((rs.cpu_util_pct IS NOT NULL) AND (rs.cpu_util_pct >= (90)::numeric)) OR ((rs.mem_util_pct IS NOT NULL) AND (rs.mem_util_pct >= (90)::numeric))) THEN 'critical'::text
                    WHEN (((rs.cpu_util_pct IS NOT NULL) AND (rs.cpu_util_pct >= (70)::numeric)) OR ((rs.mem_util_pct IS NOT NULL) AND (rs.mem_util_pct >= (70)::numeric))) THEN 'degraded'::text
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
  GROUP BY n.organization_id, COALESCE(NULLIF((n.hosting_provider)::text, ''::text), 'unknown'::text), COALESCE(NULLIF((n.region)::text, ''::text), 'unknown'::text), COALESCE(NULLIF((n.node_pool)::text, ''::text), '__unclustered__'::text);



