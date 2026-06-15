/*
 * -------------------------------------------------------
 * Section: Compute nodes v2 — domain alignment
 *
 * Adds columns required by the domain model, fixes enum values,
 * adds a node_runtime_state table for fast-changing observability
 * data, and rewrites the RLS read policy to use organization_id.
 * -------------------------------------------------------
 */

-- =====================================================================
-- 1. New canonical status enum (replace Up/Down)
--    We create a new type rather than ALTER ADD VALUE to avoid
--    Postgres transaction-commit quirks with enum alterations.
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'node_lifecycle_status') THEN
    CREATE TYPE public.node_lifecycle_status AS ENUM (
      'provisioning',
      'running',
      'draining',
      'stopped',
      'terminating',
      'error'
    );
  END IF;
END
$$;

-- =====================================================================
-- 2. New canonical health enum
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'node_health') THEN
    CREATE TYPE public.node_health AS ENUM (
      'healthy',
      'warning',
      'critical',
      'offline',
      'unknown'
    );
  END IF;
END
$$;

-- =====================================================================
-- 3. Extend public.node with stable identity / topology columns
--    Fast-changing runtime state lives in node_runtime_state (below).
-- =====================================================================

ALTER TABLE public.node
  -- Org scoping. NULL = public shared pool.
  ADD COLUMN IF NOT EXISTS organization_id uuid
    REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Machine class / instance type (e.g. 'standard-2', 'highmem-4').
  -- Distinct from node_type ('private'|'public') which is pool membership.
  ADD COLUMN IF NOT EXISTS instance_type varchar(64),

  -- Optimistic concurrency version; incremented by trigger on every UPDATE.
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,

  -- Labels (key/value pairs for filtering — stored as jsonb for GIN index).
  ADD COLUMN IF NOT EXISTS labels jsonb NOT NULL DEFAULT '{}',

  -- Simple string tags kept for backwards compatibility with domain model.
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',

  -- Network metadata.
  ADD COLUMN IF NOT EXISTS ip inet,
  ADD COLUMN IF NOT EXISTS owner varchar(255),
  ADD COLUMN IF NOT EXISTS availability_zone varchar(64),

  -- Canonical lifecycle status using the new enum.
  ADD COLUMN IF NOT EXISTS lifecycle_status public.node_lifecycle_status,

  -- Capacity (slow-changing, set at provision time).
  ADD COLUMN IF NOT EXISTS disk_gb int;

-- =====================================================================
-- 4. Trigger: auto-increment version on every UPDATE to public.node
-- =====================================================================

CREATE OR REPLACE FUNCTION public.trigger_increment_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER increment_node_version
  BEFORE UPDATE ON public.node
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_increment_version();

-- =====================================================================
-- 5. Indexes for list-page query patterns
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_node_org_deleted
  ON public.node (organization_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_node_provider_region
  ON public.node (hosting_provider, region);

CREATE INDEX IF NOT EXISTS idx_node_pool
  ON public.node (node_pool);

CREATE INDEX IF NOT EXISTS idx_node_lifecycle_status
  ON public.node (lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_node_labels
  ON public.node USING gin (labels);

-- =====================================================================
-- 6. node_runtime_state: fast-changing observability (separate table)
--    Written by the infra plane, never by user mutations.
--    Keeps hot writes off the stable node row → no version conflicts.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.node_runtime_state (
  node_id     uuid PRIMARY KEY REFERENCES public.node(id) ON DELETE CASCADE,
  health      public.node_health NOT NULL DEFAULT 'unknown',
  cpu_util_pct  numeric(5, 2),
  mem_util_pct  numeric(5, 2),
  disk_util_pct numeric(5, 2),
  last_seen_at  timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.node_runtime_state IS
  'Latest observed runtime health and utilisation for a node. '
  'Written only by the infra plane. One row per node.';

-- node_runtime_state is service_role write, authenticated read-only
-- (joined with node).
ALTER TABLE public.node_runtime_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.node_runtime_state FROM authenticated, service_role;
GRANT SELECT ON public.node_runtime_state TO authenticated;
-- Infra-plane daemon writes via service_role; explicit re-grant is required
-- because the REVOKE above stripped the default service_role privileges.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.node_runtime_state TO service_role;

CREATE POLICY "node_runtime_state_read" ON public.node_runtime_state
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.node n
      WHERE n.id = node_runtime_state.node_id
        AND (
          (n.organization_id IS NULL AND n.node_type = 'public')
          OR (
            n.organization_id IS NOT NULL
            AND public.has_role_on_organization(n.organization_id)
          )
        )
        AND n.is_deleted = false
    )
  );

-- =====================================================================
-- 7. Rewrite RLS on public.node to use organization_id
--    Public-pool nodes (organization_id IS NULL, node_type = 'public')
--    are readable by all authenticated users.
--    Private nodes are readable only by org members.
--    All writes remain service_role only (no INSERT/UPDATE/DELETE policies
--    for authenticated — consistent with original design intent).
-- =====================================================================

DROP POLICY IF EXISTS "node_read" ON public.node;

CREATE POLICY "node_read" ON public.node FOR SELECT
  TO authenticated USING (
    is_deleted = false
    AND (
      (organization_id IS NULL AND node_type = 'public')
      OR (
        organization_id IS NOT NULL
        AND public.has_role_on_organization(organization_id)
      )
    )
  );
