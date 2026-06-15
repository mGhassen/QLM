-- Node state decomposition (RFC 0026 phase 2 story 0026-001).
-- Additive: introduces lifecycle / orchestration / eligibility columns,
-- the node_drain sub-table, RLS policies, indexes, and the legacy
-- backfill. Old `lifecycle_status` column kept until story 0026-003.
-- Canonical definition: apps/web/supabase/schemas/47-node-state-decomposition.sql

-- =====================================================================
-- 1. New enums
-- =====================================================================

CREATE TYPE "public"."node_eligibility_state" AS ENUM ('eligible', 'ineligible');
CREATE TYPE "public"."node_lifecycle_state" AS ENUM ('provisioning', 'active', 'stopping', 'stopped', 'terminating', 'terminated');
CREATE TYPE "public"."node_orchestration_state" AS ENUM ('unknown', 'initializing', 'ready', 'down', 'disconnected');

-- =====================================================================
-- 2. New columns on public.node — defaults make them safe to declare
--    NOT NULL upfront for empty / dev databases.
-- =====================================================================

ALTER TABLE "public"."node"
  ADD COLUMN "lifecycle"     public.node_lifecycle_state     NOT NULL DEFAULT 'provisioning'::public.node_lifecycle_state,
  ADD COLUMN "orchestration" public.node_orchestration_state NOT NULL DEFAULT 'unknown'::public.node_orchestration_state,
  ADD COLUMN "eligibility"   public.node_eligibility_state   NOT NULL DEFAULT 'eligible'::public.node_eligibility_state;

-- =====================================================================
-- 3. Backfill — map existing lifecycle_status → new fields.
--
--    Local dev / small fixtures use this single statement. Production
--    cutover (>10k rows) must use the chunked variant in spec §6.1a.
-- =====================================================================

UPDATE "public"."node" SET
  lifecycle = CASE lifecycle_status
    WHEN 'provisioning' THEN 'provisioning'::public.node_lifecycle_state
    WHEN 'running'      THEN 'active'::public.node_lifecycle_state
    WHEN 'draining'     THEN 'active'::public.node_lifecycle_state
    WHEN 'stopped'      THEN 'stopped'::public.node_lifecycle_state
    WHEN 'terminating'  THEN 'terminating'::public.node_lifecycle_state
    WHEN 'error'        THEN 'stopped'::public.node_lifecycle_state
    ELSE 'provisioning'::public.node_lifecycle_state
  END,
  orchestration = CASE lifecycle_status
    WHEN 'provisioning' THEN 'initializing'::public.node_orchestration_state
    WHEN 'running'      THEN 'ready'::public.node_orchestration_state
    WHEN 'draining'     THEN 'ready'::public.node_orchestration_state
    WHEN 'stopped'      THEN 'down'::public.node_orchestration_state
    WHEN 'terminating'  THEN 'down'::public.node_orchestration_state
    WHEN 'error'        THEN 'down'::public.node_orchestration_state
    ELSE 'unknown'::public.node_orchestration_state
  END,
  eligibility = CASE lifecycle_status
    WHEN 'draining'     THEN 'ineligible'::public.node_eligibility_state
    WHEN 'terminating'  THEN 'ineligible'::public.node_eligibility_state
    WHEN 'error'        THEN 'ineligible'::public.node_eligibility_state
    ELSE 'eligible'::public.node_eligibility_state
  END
WHERE lifecycle_status IS NOT NULL;

-- =====================================================================
-- 4. node_drain — 1:1 sub-table for structured drain state.
-- =====================================================================

CREATE TABLE "public"."node_drain" (
  "node_id"            uuid PRIMARY KEY REFERENCES "public"."node"(id) ON DELETE CASCADE,
  "active"             boolean      NOT NULL DEFAULT false,
  "deadline"           timestamptz  NULL,
  "ignore_system_jobs" boolean      NOT NULL DEFAULT false,
  "force"              boolean      NOT NULL DEFAULT false,
  "started_at"         timestamptz  NULL,
  "completed_at"       timestamptz  NULL,
  "created_at"         timestamptz  NOT NULL DEFAULT now(),
  "updated_at"         timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE "public"."node_drain" IS
  'Structured drain state — Nomad DrainStrategy shape. 1:1 with public.node. RLS inherits via node ownership.';

ALTER TABLE "public"."node_drain" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read node_drain" ON "public"."node_drain"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."node" n
      WHERE n.id = node_drain.node_id
        AND public.has_role_on_organization(n.organization_id, 'member')
    )
  );

CREATE POLICY "admins can write node_drain" ON "public"."node_drain"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "public"."node" n
      WHERE n.id = node_drain.node_id
        AND public.has_role_on_organization(n.organization_id, 'admin')
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_node_drain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER node_drain_touch_updated_at
BEFORE UPDATE ON "public"."node_drain"
FOR EACH ROW EXECUTE FUNCTION public.touch_node_drain_updated_at();

-- Backfill: legacy `draining` rows get a corresponding node_drain entry.
INSERT INTO "public"."node_drain" (node_id, active, started_at)
SELECT id, true, now() FROM "public"."node" WHERE lifecycle_status = 'draining'
ON CONFLICT (node_id) DO NOTHING;

-- =====================================================================
-- 5. Indexes — partial, exclude soft-deleted rows.
-- =====================================================================

CREATE INDEX idx_node_lifecycle     ON "public"."node" USING btree (lifecycle)     WHERE (is_deleted = false);
CREATE INDEX idx_node_orchestration ON "public"."node" USING btree (orchestration) WHERE (is_deleted = false);
CREATE INDEX idx_node_eligibility   ON "public"."node" USING btree (eligibility)   WHERE (is_deleted = false);
