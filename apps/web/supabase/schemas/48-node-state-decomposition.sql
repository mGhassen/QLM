/*
 * -------------------------------------------------------
 * Section: Node state decomposition (phase 2 story 0026-001)
 *
 * Replaces the single `lifecycle_status` enum with five orthogonal
 * axes: lifecycle (intent), orchestration (observed), eligibility
 * (operator), drain (sub-table), health (derived — not stored).
 *
 * This story is ADDITIVE. The old `lifecycle_status` column + enum
 * stay. Story 0026-002 ships a SQL trigger to project the legacy
 * column from the new fields. Story 0026-003 drops it.
 *
 * RFC 0026 §5 + spec §6.1.
 * -------------------------------------------------------
 */

-- =====================================================================
-- 1. New enums
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'node_lifecycle_state') THEN
    CREATE TYPE public.node_lifecycle_state AS ENUM (
      'provisioning',
      'active',
      'stopping',
      'stopped',
      'terminating',
      'terminated'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'node_orchestration_state') THEN
    CREATE TYPE public.node_orchestration_state AS ENUM (
      'unknown',
      'initializing',
      'ready',
      'down',
      'disconnected'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'node_eligibility_state') THEN
    CREATE TYPE public.node_eligibility_state AS ENUM (
      'eligible',
      'ineligible'
    );
  END IF;
END
$$;

-- =====================================================================
-- 2. New columns on public.node — nullable initially for the backfill,
--    NOT NULL after the UPDATE statement below.
-- =====================================================================

ALTER TABLE public.node
  ADD COLUMN IF NOT EXISTS lifecycle      public.node_lifecycle_state,
  ADD COLUMN IF NOT EXISTS orchestration  public.node_orchestration_state,
  ADD COLUMN IF NOT EXISTS eligibility    public.node_eligibility_state;

-- =====================================================================
-- 3. node_drain — 1:1 sub-table for structured drain state.
--    Operator intent + deadline. Inherits RLS from public.node ownership.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.node_drain (
  node_id            uuid PRIMARY KEY REFERENCES public.node(id) ON DELETE CASCADE,
  active             boolean      NOT NULL DEFAULT false,
  deadline           timestamptz  NULL,
  ignore_system_jobs boolean      NOT NULL DEFAULT false,
  force              boolean      NOT NULL DEFAULT false,
  started_at         timestamptz  NULL,
  completed_at       timestamptz  NULL,
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.node_drain IS
  'Structured drain state — Nomad DrainStrategy shape. 1:1 with public.node. RLS inherits via node ownership.';

ALTER TABLE public.node_drain ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can read node_drain" ON public.node_drain;
CREATE POLICY "members can read node_drain" ON public.node_drain
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.node n
      WHERE n.id = node_drain.node_id
        AND has_role_on_organization(n.organization_id, 'member')
    )
  );

DROP POLICY IF EXISTS "admins can write node_drain" ON public.node_drain;
DROP POLICY IF EXISTS "admins can insert node_drain" ON public.node_drain;
DROP POLICY IF EXISTS "admins can update node_drain" ON public.node_drain;
DROP POLICY IF EXISTS "admins can delete node_drain" ON public.node_drain;

CREATE POLICY "admins can insert node_drain" ON public.node_drain
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.node n
      WHERE n.id = node_drain.node_id
        AND has_role_on_organization(n.organization_id, 'admin')
    )
  );

CREATE POLICY "admins can update node_drain" ON public.node_drain
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.node n
      WHERE n.id = node_drain.node_id
        AND has_role_on_organization(n.organization_id, 'admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.node n
      WHERE n.id = node_drain.node_id
        AND has_role_on_organization(n.organization_id, 'admin')
    )
  );

CREATE POLICY "admins can delete node_drain" ON public.node_drain
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.node n
      WHERE n.id = node_drain.node_id
        AND has_role_on_organization(n.organization_id, 'admin')
    )
  );

-- =====================================================================
-- 4. updated_at trigger on node_drain (mirrors node table convention).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.touch_node_drain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS node_drain_touch_updated_at ON public.node_drain;
CREATE TRIGGER node_drain_touch_updated_at
BEFORE UPDATE ON public.node_drain
FOR EACH ROW EXECUTE FUNCTION public.touch_node_drain_updated_at();

-- =====================================================================
-- 5. Backfill — map existing lifecycle_status → new fields.
--
--    Local dev / small fixtures: single statement is fine (~150 rows).
--    Production cutover (>10k rows) MUST use the chunked variant in
--    spec §6.1a. The single statement holds row-level locks for the
--    whole table — fine here, dangerous in prod.
-- =====================================================================

UPDATE public.node SET
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
WHERE lifecycle IS NULL;

-- A node that was `draining` in the legacy enum gets a corresponding
-- node_drain row. Other lifecycle values get no drain row.
INSERT INTO public.node_drain (node_id, active, started_at)
SELECT id, true, now() FROM public.node WHERE lifecycle_status = 'draining'
ON CONFLICT (node_id) DO NOTHING;

-- =====================================================================
-- 6. Lock the new columns down to NOT NULL after the backfill.
-- =====================================================================

ALTER TABLE public.node
  ALTER COLUMN lifecycle      SET NOT NULL,
  ALTER COLUMN orchestration  SET NOT NULL,
  ALTER COLUMN eligibility    SET NOT NULL,
  ALTER COLUMN lifecycle      SET DEFAULT 'provisioning'::public.node_lifecycle_state,
  ALTER COLUMN orchestration  SET DEFAULT 'unknown'::public.node_orchestration_state,
  ALTER COLUMN eligibility    SET DEFAULT 'eligible'::public.node_eligibility_state;

-- =====================================================================
-- 7. Indexes — composite (org_id, axis), partial on live rows.
--
-- List-page queries always filter by `organization_id` first then by an
-- axis. Single-column axis indexes would not be used when org_id is the
-- leading filter; the composite shape matches the access pattern.
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_node_org_lifecycle
  ON public.node (organization_id, lifecycle)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_node_org_orchestration
  ON public.node (organization_id, orchestration)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_node_org_eligibility
  ON public.node (organization_id, eligibility)
  WHERE is_deleted = false;
