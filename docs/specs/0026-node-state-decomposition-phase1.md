# Spec — Node state decomposition (phase 2)

| Field        | Value                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Status       | Draft (v2 — RFC amendments folded 2026-04-27)                               |
| Author       | Mohamed Aziz Ktata                                                          |
| Created      | 2026-04-27                                                                  |
| Implements   | [RFC 0026 — Node state decomposition](../rfcs/0026-node-state-decomposition.md) |
| Target phase | Phase 2 (single phase, three sequential stories)                            |

---

## 1. Resolved open questions

| #  | Question                                                                          | Resolution                                                                                                                                                                                                                                                            |
| -- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | Drain — sub-object on Node or its own table?                                       | Separate table `public.node_drain` (1:1 with `node`); domain `Node.drain?: NodeDrain` is the materialized view of that row.                                                                                                                                            |
| 2  | Eligibility — 5th axis or fold into orchestration?                                  | 5th axis. Operator intent ≠ observed state.                                                                                                                                                                                                                            |
| 3  | Lifecycle value naming — `running` or `active`?                                     | **`active`** (intent). `running` reads as observed, conflates intent with observation. Final values: `provisioning \| active \| stopping \| stopped \| terminating \| terminated`.                                                                                      |
| 4  | Lifecycle transition semantics                                                      | `stopping` / `terminating` are transient. `stopped` stable, reusable. `terminated` irreversible.                                                                                                                                                                       |
| 5  | Orchestration enum — bootstrap value?                                               | Add `unknown` as default before first heartbeat. Five values: `unknown \| initializing \| ready \| down \| disconnected`. `reconnecting` deferred to phase 7+.                                                                                                          |
| 6  | Health enum membership                                                              | `healthy \| degraded \| critical \| unknown`. Drop legacy `offline` (redundant with `orchestration: 'down'`).                                                                                                                                                          |
| 7  | `PressurePoint.kind` after status removal                                           | `'unreachable' \| 'failing' \| 'high-cpu' \| 'high-mem' \| 'critical-health'`.                                                                                                                                                                                          |
| 8  | Backfill mapping from existing `lifecycle_status`                                   | See RFC §8 q8. Note: `running` rows backfill to `lifecycle=active`. SQL UPDATE in story 0026-001.                                                                                                                                                                       |
| 9  | Health derivation thresholds + TS↔SQL parity                                        | Hardcoded constants in `packages/domain/src/services/node/health-thresholds.ts` (`CPU_HIGH=70, CPU_CRITICAL=90, MEM_HIGH=70, MEM_CRITICAL=90`). SQL `pool_view` uses identical literals; CI parity test asserts.                                                          |
| 10 | Single-node vs aggregate health derivation                                          | Single-node: TypeScript pure `deriveNodeHealth(...)`. Aggregate (`pool_view`): SQL `COUNT(*) FILTER (...)` expressions with shared thresholds. RFC §5.5.                                                                                                                |
| 11 | `getNodeDisplayState` precedence                                                    | inactive > unreachable > critical > draining > ineligible > degraded > running > pending. Tested.                                                                                                                                                                      |
| 12 | `displayState` vs `health` invariants                                                | `health` = pure telemetry; `displayState` = UI abstraction. Never persist `displayState`. Never use in domain logic. Never aggregate by it. ESLint `no-display-state-in-domain` enforces import scope. RFC §5.4a.                                                       |
| 13 | Drain and eligibility coupling                                                       | **Decoupled at domain.** `DrainNodeInput.setIneligibleOnStart: boolean` (default `true`). Operator may drain without flipping eligibility. Eligibility chip stays interactive during drain.                                                                            |
| 14 | Dual-write direction during the migration window                                    | **Inverted.** Application reads + writes new fields only. Old `lifecycle_status` column = trigger-maintained projection (`sync_legacy_status_from_new_fields()` BEFORE UPDATE on `public.node`). RFC §7.2.                                                              |
| 15 | Trigger precedence for legacy `lifecycle_status` projection                         | Deterministic, terminal-lifecycle-first. Full SQL function body in RFC §7.2. SQL fixture test `precedence-table.test.sql` asserts the mapping table for all (lifecycle × orchestration × drain.active) tuples.                                                          |
| 16 | Bulk drain / bulk eligibility                                                       | Out of scope (phase 2.5).                                                                                                                                                                                                                                              |
| 17 | Audit log entries for state transitions                                             | Out of scope (phase 6, SOC 2 work).                                                                                                                                                                                                                                    |
| 18 | ESLint enforcement of "UI doesn't write `orchestration`"                            | Custom rule `no-orchestration-write` in `tooling/eslint/`. Errors on `node.orchestration =` outside `packages/repositories/**` and `apps/server/**`.                                                                                                                   |
| 19 | Verification ordering — how do we know `node.status` is gone in 0026-003?           | typecheck > lint > grep. Drop the field from the Zod schema → every reference compile-errors. ESLint `no-deprecated-status-field` backstops `as any` escape hatches. `grep` is the human-readable sanity check, not the only guard.                                     |
| 20 | SQL migration ordering inside a story                                                | Task 1 = SQL migration; consumers come later. CI runs `supabase:web:reset && supabase:web:typegen` before typecheck. Local dev: postinstall hook detects schema-mtime drift and errors loudly. RFC §7.4.                                                                |
| 21 | Production backfill at scale                                                         | Single-statement `UPDATE` is fine for local fixtures (~150 rows). Production cutover (>10k rows) uses chunked migration in a `DO $$` loop with `pg_sleep(0.1)` between batches of 1000. §6.1 has the SQL.                                                              |
| 22 | Production rollout for story 0026-003                                               | Local-only `/finish` flow merges atomically. Production requires deploy-code-first → verify → migrate. Spec §13 captures the production rollout note + flags it as out of scope for `/finish`. CI guards via `migrations.lock` precedence checks.                       |
| 23 | `expectedVersion` on the new mutation methods                                       | Yes — same optimistic-concurrency pattern as `changeStatus`. Conflict throws `DomainException(NODE_VERSION_CONFLICT)`.                                                                                                                                                  |
| 24 | What happens to `STATUS_TO_SQL` / `SQL_STATUS_TO_DOMAIN` constants?                 | Replaced by 4 new mapping tables (one per enum) during 0026-002; old tables deleted in 0026-003.                                                                                                                                                                       |

## 2. User stories

- As a platform operator, I can put a node into drain with a deadline (or no-deadline). The UI shows "drain finishes in 18min" and a cancel button.
- As a platform operator, I can mark a node ineligible without draining it (cordon for maintenance), and revert that without restarting the node.
- As a platform operator, I see a `disconnected` chip distinct from `down` — my node is briefly unreachable, allocations may still recover.
- As a developer, I can read `node.lifecycle` and trust it reflects operator intent only — not observed runtime state.
- As a developer, I can read `node.orchestration` and trust it reflects observed orchestrator state only — not what the operator wanted.
- As a developer, I can call `getNodeDisplayState(node)` and get one of eight composite badges with documented precedence.
- As a developer, the type system + ESLint prevent me from accidentally writing `node.orchestration` from the UI layer.
- As a topology user, pool aggregations stop conflating operator intent with observed state. Pools render `healthCounts` + `lifecycleCounts` separately.

## 3. Functional flow

### 3.1 Information architecture

No new top-level routes. New surfaces:

- `infrastructure-replicas-section.tsx` (existing) untouched.
- Per-node detail page (`/node/$id`): new "Drain" + "Eligibility" buttons in the action row. New drain banner when `drain.active`.
- Pool sheet: `lifecycleCounts` + `healthCounts` instead of `statusCounts`. Status distribution bar reads health.
- Topology fleet summary aside: "attention" CTA filter changes to `health:critical | drain.active | orchestration:down`.

### 3.2 Screen-by-screen

#### Per-node detail header — new actions

- **Drain button** (replaces current "drain" status button):
  - Disabled when `drain.active` (already draining).
  - Opens a `DrainDialog` with: deadline (default 1h, "no deadline" toggle), `ignoreSystemJobs` checkbox, `force` checkbox.
  - Submit calls `shell.nodes.drain({ id, deadline, ignoreSystemJobs, force })`.
- **Eligibility toggle** (new):
  - Shows "Eligible" / "Ineligible" chip, click toggles.
  - Disabled when `drain.active` (drain owns eligibility).
- **Stop button** (replaces "stop" status button):
  - Calls `shell.nodes.setLifecycle({ id, lifecycle: 'stopping' })`.

#### Drain banner

When `drain.active`, a banner shows above the section stack:

```
[icon] Draining — completes in 18m 42s    [Cancel drain]
```

Countdown derived from `drain.deadline`. Cancel calls `shell.nodes.drainCancel({ id, keepIneligible: true })` by default.

#### Health badge (`HealthStatusBadge`) — composite display

Reads `getNodeDisplayState(node)`. Tones:

- `running` → emerald
- `degraded` → amber
- `critical` → destructive
- `unreachable` → destructive (different copy)
- `draining` → amber w/ animation
- `ineligible` → muted
- `inactive` → muted
- `pending` → blue

#### Topology pool card

Status distribution bar (today: 4 status segments) becomes 4 health segments. New row underneath: 6 lifecycle counts (small dots).

### 3.3 User flows (happy paths)

#### Flow 1: drain a node with a deadline

1. User opens `/node/<id>` for a `running` node.
2. Clicks Drain → DrainDialog opens.
3. User picks `deadline: 30m`, leaves other defaults.
4. Submit → `POST /api/nodes/:id/drain` → orchestrator (mocked) sets `drain={active:true, deadline:NOW+30m, ...}` and `eligibility=ineligible`.
5. Detail page re-renders: drain banner appears with countdown; eligibility chip shows "Ineligible" (greyed, drain owns).
6. Health badge composite: `draining`.

#### Flow 2: cordon without draining

1. User opens a `running, eligible` node.
2. Clicks the eligibility chip → toggles to `ineligible`.
3. → `POST /api/nodes/:id/eligibility` → server writes `eligibility=ineligible`. No drain.
4. Detail page: chip "Ineligible". Health badge: `ineligible`. No banner.

#### Flow 3: terminate

1. User clicks the trash icon on a `stopped` node.
2. AlertDialog → confirm.
3. → `POST /api/nodes/:id/lifecycle { lifecycle: 'terminating' }`.
4. Re-render: lifecycle chip "terminating" (blue). Orchestration eventually flips to `down`. Health: `unknown`.
5. After provisioner cleanup → `lifecycle=terminated`, row disappears from default node list (filter excludes `terminated` by default).

### 3.4 Error and edge-case behaviour

- **Optimistic concurrency conflict** on drain/eligibility/lifecycle: server returns 409. UI shows toast "Node was changed elsewhere — refreshing". Refetches.
- **Drain with no-deadline** (`deadline: null` in body): banner reads "Draining — no deadline" (no countdown).
- **Drain auto-completes**: orchestrator sets `drain.completedAt` and `drain.active=false`. Banner disappears; eligibility stays `ineligible` unless operator explicitly re-enables.
- **Node disconnected during drain**: drain stalls (allocations can't migrate). Banner shows "Stalled — orchestrator unreachable".
- **Health = unknown**: badge tone muted, copy "No data yet".

## 4. Technical flow

### 4.1 Layered sequence — drain a node

```
DrainDialog onSubmit
  → shell.nodes.drain({ id, deadline, ignoreSystemJobs, force })
    → new DrainNodeService(repo).execute({...})
      → repo.setDrain(id, drain, expectedVersion)  + repo.setEligibility(id, 'ineligible', ...)
        → POST /api/nodes/:id/drain  (HTTP adapter)
          → server route validates body, calls service
            → SupabaseNodeRepository: UPSERT public.node_drain + UPDATE public.node SET eligibility='ineligible', version=version+1
              → react-query invalidates shell.nodes.detail(id) + shell.nodes.list cache + shell.fleet.summary cache
```

### 4.2 Health derivation flow

```
SupabaseNodeRepository.findByOrganizationId
  → SELECT public.node + public.node_runtime_state + public.node_drain
    → for each row: deriveNodeHealth(node, runtimeState, now)  (pure)
      → return Node with `health` set
```

Health is computed on read. Never persisted. Adapter discards any `health` value the client may try to write.

### 4.3 Component split

- **Domain**: `DrainNodeService`, `SetNodeEligibilityService`, `SetNodeLifecycleService`, `deriveNodeHealth`. Pure. Composed via `INodeRepository`.
- **Adapter**: `SupabaseNodeRepository.setDrain / setEligibility / setLifecycle`. HTTP adapter mirrors.
- **Server**: 4 new endpoints. `zValidator` for bodies.
- **Runtime**: `shell.nodes.drain`, `.drainCancel`, `.setEligibility`, `.setLifecycle`. Cache invalidation includes `shell.fleet.summary`.
- **Presentation**: `getNodeDisplayState` (UI lib), `HealthStatusBadge` (consumes composite), `DrainDialog`, `DrainBanner`, `EligibilityChip`, action-row buttons. Pool aggregations + fleet summary read new fields.

## 5. API contracts

### 5.1 Data shapes

```ts
// packages/domain/src/entities/node.type.ts (additions)
export const NODE_LIFECYCLE_STATES = [
  'provisioning', 'active', 'stopping', 'stopped', 'terminating', 'terminated',
] as const;
export type NodeLifecycleState = (typeof NODE_LIFECYCLE_STATES)[number];

export const NODE_ORCHESTRATION_STATES = [
  'unknown', 'initializing', 'ready', 'down', 'disconnected',
] as const;
export type NodeOrchestrationState = (typeof NODE_ORCHESTRATION_STATES)[number];

export const NODE_ELIGIBILITY_STATES = ['eligible', 'ineligible'] as const;
export type NodeEligibility = (typeof NODE_ELIGIBILITY_STATES)[number];

export const NODE_HEALTH_STATES = [
  'healthy', 'degraded', 'critical', 'unknown',
] as const;
export type NodeHealthState = (typeof NODE_HEALTH_STATES)[number];

export const NodeDrainSchema = z.object({
  active: z.boolean(),
  deadline: z.string().datetime().optional(),
  ignoreSystemJobs: z.boolean().default(false),
  force: z.boolean().default(false),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});
export type NodeDrain = z.infer<typeof NodeDrainSchema>;

// Node schema gains:
//   lifecycle: NodeLifecycleState           (default 'provisioning')
//   orchestration: NodeOrchestrationState   (default 'unknown' — no longer optional)
//   eligibility: NodeEligibility            (default 'eligible')
//   drain: NodeDrain | undefined            (sub-object materialized from public.node_drain)
//   health: NodeHealthState                 (computed; never written)
// And loses (story 0026-003):
//   status
//   healthState
```

```ts
// packages/domain/src/usecases/dto/node-usecase-dto.ts (additions)
export type DrainNodeInput = {
  id: string;
  deadline?: string;
  ignoreSystemJobs?: boolean;
  force?: boolean;
  /**
   * When `true` (default), the service writes both the drain row AND
   * `eligibility = 'ineligible'` in one transaction. When `false`, only
   * the drain row is written — caller wants the rare "drain but keep
   * accepting trickle traffic" path. RFC §5.5a.
   */
  setIneligibleOnStart?: boolean;
  expectedVersion: number;
};
export type DrainCancelInput = {
  id: string;
  keepIneligible?: boolean;
  expectedVersion: number;
};
export type SetEligibilityInput = {
  id: string;
  eligibility: NodeEligibility;
  expectedVersion: number;
};
export type SetLifecycleInput = {
  id: string;
  lifecycle: NodeLifecycleState;
  expectedVersion: number;
};
```

### 5.2 Endpoints

| Method | Path                                  | Body                                                                                  | Response   |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------- | ---------- |
| POST   | `/api/nodes/:id/drain`                | `{ deadline?, ignoreSystemJobs?, force?, setIneligibleOnStart?, expectedVersion }`     | `Node`     |
| POST   | `/api/nodes/:id/drain/cancel`         | `{ keepIneligible?, expectedVersion }`                                                 | `Node`     |
| POST   | `/api/nodes/:id/eligibility`          | `{ eligibility, expectedVersion }`                                                     | `Node`     |
| POST   | `/api/nodes/:id/lifecycle`            | `{ lifecycle: 'active' \| 'stopping' \| 'stopped' \| 'terminating', expectedVersion }` | `Node`     |

Status codes: 200 happy, 400 validation, 401 no session, 403 cross-org, 404 missing node, 409 version conflict, 500 server error.

### 5.3 Caching

- React Query keys per node use `keys.detail(id)`. Invalidated on every mutation.
- `shell.fleet.summary` and `shell.fleet.pools` invalidated on lifecycle / eligibility / drain mutations because pool aggregations depend on them.
- `staleTime` for detail: 30s. Mutations always invalidate.

## 6. Data model

### 6.1 Schema

New file: `apps/web/supabase/schemas/47-node-state-decomposition.sql`.

```sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'node_lifecycle_state') THEN
    CREATE TYPE public.node_lifecycle_state AS ENUM (
      'provisioning', 'active', 'stopping', 'stopped', 'terminating', 'terminated'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'node_orchestration_state') THEN
    CREATE TYPE public.node_orchestration_state AS ENUM (
      'unknown', 'initializing', 'ready', 'down', 'disconnected'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'node_eligibility_state') THEN
    CREATE TYPE public.node_eligibility_state AS ENUM ('eligible', 'ineligible');
  END IF;
END $$;

ALTER TABLE public.node
  ADD COLUMN IF NOT EXISTS lifecycle      public.node_lifecycle_state,
  ADD COLUMN IF NOT EXISTS orchestration  public.node_orchestration_state,
  ADD COLUMN IF NOT EXISTS eligibility    public.node_eligibility_state DEFAULT 'eligible';

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

ALTER TABLE public.node_drain ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read node_drain" ON public.node_drain
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.node n
      WHERE n.id = node_drain.node_id
        AND has_role_on_organization(n.organization_id, 'member')
    )
  );

CREATE POLICY "admins can write node_drain" ON public.node_drain
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.node n
      WHERE n.id = node_drain.node_id
        AND has_role_on_organization(n.organization_id, 'admin')
    )
  );

-- Backfill: map existing lifecycle_status → new fields.
-- Local dev (small fixtures) uses the single statement. PRODUCTION must use
-- the chunked variant in §6.1a to avoid long lock windows.
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

INSERT INTO public.node_drain (node_id, active, started_at)
SELECT id, true, now() FROM public.node WHERE lifecycle_status = 'draining'
ON CONFLICT (node_id) DO NOTHING;

-- After backfill, set NOT NULL on the new columns
ALTER TABLE public.node
  ALTER COLUMN lifecycle      SET NOT NULL,
  ALTER COLUMN orchestration  SET NOT NULL,
  ALTER COLUMN eligibility    SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_node_lifecycle    ON public.node (lifecycle)    WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_node_orchestration ON public.node (orchestration) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_node_eligibility  ON public.node (eligibility)  WHERE is_deleted = false;
```

After landing: `pnpm supabase:web:reset && pnpm supabase:web:typegen`.

#### 6.1a Production backfill (chunked)

The single-statement `UPDATE` above holds row-level locks for the whole table — fine for ~150-row fixtures, dangerous on >10k. Production cutover uses the chunked variant:

```sql
DO $$
DECLARE
  batch_size INT := 1000;
  updated_count INT;
BEGIN
  LOOP
    WITH cte AS (
      SELECT id FROM public.node WHERE lifecycle IS NULL LIMIT batch_size
    )
    UPDATE public.node n SET
      lifecycle    = /* ... CASE expression as above ... */,
      orchestration= /* ... */,
      eligibility  = /* ... */
    FROM cte WHERE n.id = cte.id;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    EXIT WHEN updated_count = 0;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
```

Run via `supabase db push --include-all` with the chunked SQL substituted in production. CI guards with a sentinel comment in the migration: `-- @migration-mode: dev-only` for the single-statement file; production replicates with the chunked file.

#### 6.1b Story 0026-002 — trigger migration

`apps/web/supabase/schemas/48-node-legacy-status-trigger.sql`:

```sql
CREATE OR REPLACE FUNCTION public.sync_legacy_status_from_new_fields()
RETURNS TRIGGER AS $$
DECLARE
  drain_active boolean;
BEGIN
  SELECT COALESCE(active, false) INTO drain_active
  FROM public.node_drain WHERE node_id = NEW.id;

  NEW.lifecycle_status :=
    CASE
      WHEN NEW.lifecycle = 'terminated'                              THEN 'terminating'
      WHEN NEW.lifecycle = 'terminating'                             THEN 'terminating'
      WHEN drain_active                                              THEN 'draining'
      WHEN NEW.orchestration IN ('down', 'disconnected')             THEN 'stopped'
      WHEN NEW.lifecycle = 'stopped'                                 THEN 'stopped'
      WHEN NEW.lifecycle = 'stopping'                                THEN 'draining'
      WHEN NEW.lifecycle = 'active' AND NEW.orchestration = 'ready'  THEN 'running'
      WHEN NEW.lifecycle = 'provisioning'                            THEN 'provisioning'
      ELSE 'provisioning'
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS node_legacy_status_sync ON public.node;
CREATE TRIGGER node_legacy_status_sync
BEFORE INSERT OR UPDATE ON public.node
FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_status_from_new_fields();
```

Test fixture `precedence-table.test.sql` enumerates every (lifecycle × orchestration × drain.active) tuple and asserts the projected `lifecycle_status` matches the documented mapping.

#### 6.1c Story 0026-003 — final cleanup

`apps/web/supabase/schemas/49-node-state-cleanup.sql`:

```sql
DROP TRIGGER IF EXISTS node_legacy_status_sync ON public.node;
DROP FUNCTION IF EXISTS public.sync_legacy_status_from_new_fields();
ALTER TABLE public.node DROP COLUMN IF EXISTS lifecycle_status;
DROP TYPE IF EXISTS public.node_lifecycle_status;
```

Drop trigger before column. Atomic in one migration file.

### 6.2 RLS

- New `public.node_drain` RLS policies (above) inherit from `public.node` ownership via `has_role_on_organization`.
- `public.node` policies unchanged — adding columns doesn't affect row policies.
- The existing `pool_view` (RFC 0025) regenerates automatically on the next `supabase:web:reset` because it's defined declaratively. Verify it picks up the new lifecycle/orchestration columns if the spec wants pool aggregations on them. (Story 0026-002 updates `pool_view` to expose `lifecycle_counts` + `health_counts` JSONB columns.)

## 7. File-by-file work items

### 7.1 Domain (`packages/domain`)

- **Add** `src/entities/node-drain.type.ts` — `NodeDrainSchema`.
- **Edit** `src/entities/node.type.ts` — add `lifecycle`, `orchestration`, `eligibility`, `drain`, `health`. Phase-2-001 keeps `status` for compat; phase-2-003 removes it.
- **Add** `src/repositories/node-repository.port.ts` — `setLifecycle`, `setEligibility`, `setDrain` abstract methods.
- **Add** `src/services/node/drain-node.usecase.ts` — `DrainNodeService`.
- **Add** `src/services/node/drain-cancel-node.usecase.ts` — `DrainCancelNodeService`.
- **Add** `src/services/node/set-eligibility.usecase.ts`.
- **Add** `src/services/node/set-lifecycle.usecase.ts` — replaces `change-node-status.usecase.ts` (deleted in 0026-003).
- **Add** `src/services/node/derive-health.ts` — pure `deriveNodeHealth`.
- **Add** DTOs in `src/usecases/dto/node-usecase-dto.ts`: `DrainNodeInput`, `DrainCancelInput`, `SetEligibilityInput`, `SetLifecycleInput`.
- **Add** unit tests under `__tests__/services/node/` for each new service + `derive-health.test.ts`.
- **Add** unit test `__tests__/services/node/derive-health-thresholds.test.ts` covering boundary conditions on `HIGH_CPU`, `CRITICAL_CPU`, `HIGH_MEM`, `CRITICAL_MEM`.

### 7.2 Adapters

- **Edit** `packages/repositories/supabase/src/node.repository.ts`:
  - Add `setLifecycle`, `setEligibility`, `setDrain` implementations.
  - Update `mapRowToNode` to return new fields. Drop `status` after 0026-003.
  - Replace `STATUS_TO_SQL` / `SQL_STATUS_TO_DOMAIN` with four new mapping tables.
  - JOIN `public.node_drain` in `NODE_SELECT`.
  - Compute `health` via `deriveNodeHealth(node, runtimeState, new Date())` before returning.
- **Edit** `apps/web/src/lib/repositories/node.repository.ts`: HTTP adapter mirrors. Methods call new endpoints.

### 7.3 Server (`apps/server`)

- **Edit** `src/routes/nodes.ts`: add 4 new POST sub-routes + zValidator schemas.
- **Edit** server tests `__tests__/nodes.test.ts`: cover happy + 400 + 404 + 409 for each.
- **Edit** `__tests__/helpers/mock-repositories.ts`: stub the new repo methods.

### 7.4 Shell runtime (`packages/shell-runtime`)

- **Edit** `src/resources/nodes.ts`:
  - Add `drain`, `drainCancel`, `setEligibility`, `setLifecycle` mutations.
  - Each invalidates `shell.nodes.detail(id)`, `shell.nodes.list`, `shell.fleet.summary`, `shell.fleet.pools`, `shell.fleet.pressurePoints`.
  - Remove `changeStatus` in 0026-003.

### 7.5 Presentation — feature pkg (`packages/features/ops/infrastructure`)

- **Add** `src/presentation/lib/get-node-display-state.ts`.
- **Add** `src/presentation/lib/get-node-display-state.test.ts` — precedence + boundary cases.
- **Add** `src/presentation/components/drain-dialog.tsx`.
- **Add** `src/presentation/components/drain-banner.tsx`.
- **Add** `src/presentation/components/eligibility-chip.tsx`.
- **Edit** `src/presentation/cells/health-status-badge.tsx`: switch from `status` to `getNodeDisplayState`.
- **Edit** `src/presentation/components/detail-page.tsx`: action row uses new buttons + new banner.
- **Edit** `src/application/use-actions.ts`: replace `changeStatus` with `drain` / `drainCancel` / `setEligibility` / `setLifecycle`.

### 7.6 Topology (`packages/features/ops/topology`)

- **Edit** `src/presentation/components/topology-pool-card.tsx`: replace status distribution with health distribution. Add lifecycle dot row.
- **Edit** `src/presentation/components/topology-fleet-summary.tsx`: distribution section reads `summary.healthCounts`. Pressure list kinds update.
- **Edit** `src/application/constants.ts`: rename `STATUS_DOT` → `HEALTH_DOT`. Add `LIFECYCLE_DOT`.
- **Edit** `src/presentation/components/topology-pressure-list.tsx`: 5-kind icon map.

### 7.7 Domain — Pool

- **Edit** `packages/domain/src/entities/pool.type.ts`:
  - Add `lifecycleCounts: Record<NodeLifecycleState, number>`.
  - Add `healthCounts: Record<NodeHealthState, number>`.
  - Drop `statusCounts`.
- **Edit** `packages/domain/src/services/fleet/fleet-aggregate.usecase.ts`: aggregations switch axes.
- **Edit** `packages/repositories/supabase/src/pool.repository.ts`: VIEW emits the new counts.
- **Edit** `apps/web/supabase/schemas/46-platform-pools.sql`: VIEW updated to emit `lifecycle_counts` + `health_counts` jsonb.
- **Edit** `apps/web/src/lib/msw/handlers/pools.ts`: aggregation logic mirrors.

### 7.8 ESLint guard

- **Add** `tooling/eslint/rules/no-orchestration-write.js`.
- **Edit** `tooling/eslint/react.js` (or base): wire the rule, error-level outside allowlist.

### 7.9 i18n

- **Edit** `apps/web/src/lib/i18n/locales/en/nodes.json`:
  - New keys: `lifecycle.{provisioning,active,stopping,stopped,terminating,terminated}`.
  - New keys: `orchestration.{initializing,ready,down,disconnected}`.
  - New keys: `eligibility.{eligible,ineligible}`.
  - New keys: `drain.{title,deadline,deadlineNone,ignoreSystemJobs,force,start,cancel,banner.draining,banner.deadline,banner.cancel,banner.stalled}`.
  - New keys: `health.{healthy,degraded,critical,unknown}`.
  - New keys: `displayState.{inactive,unreachable,critical,draining,ineligible,degraded,running,pending}`.
- **Edit** `apps/web/src/lib/i18n/locales/en/topology.json`:
  - New `pressure.kind.{unreachable,failing,highCpu,highMem,criticalHealth}`.
  - Drop `pressure.kind.down`.
- **Delete** old `nodes.status.*` keys at end of 0026-003.

## 8. Permissions and RLS

- **`node_drain`**: read = `member`, write = `admin`. Mirrors node mutations.
- **No new permission enum values.** Drain/eligibility/lifecycle all gated by existing `admin` role.
- **Audit log**: phase 2 emits no new audit events. Phase 6 (RFC 0030+) adds `node.drain.start`, `node.drain.cancel`, `node.eligibility.set`, `node.lifecycle.set`.

## 9. Security checklist

- [x] **Input validation**: all 4 new endpoints use `zValidator`.
- [x] **RLS**: `node_drain` has explicit policies; `pool_view` is `security_invoker`.
- [x] **No new secrets.** No new environment variables.
- [x] **Optimistic concurrency**: `expectedVersion` on every mutation. Conflict throws `DomainException(NODE_VERSION_CONFLICT)`. Server returns 409.
- [x] **No PII added.** Drain/eligibility carry timestamps, booleans, enum values only.
- [x] **Generic error messages.** Server never reveals which org owns a node on 403/404.
- [x] **Health derivation** is server-side. UI never trusts a client-supplied `health` value (adapter discards).

## 10. Verification plan

### 10.1 Static checks — ordering matters

Verify in this order; the type system is the primary guard, not `grep`:

1. **`pnpm typecheck`** — Zod schema drop in story 0026-003 surfaces every `node.status` reference as a compile error. Catches destructured access, optional chaining, `as` cast targets, JSX prop usage. Type system carries 95% of the load.
2. **`pnpm lint`** — ESLint custom rules backstop:
   - `no-orchestration-write` — UI cannot mutate `node.orchestration` (story 0026-001+).
   - `no-display-state-in-domain` — `getNodeDisplayState` import only inside `packages/features/**/presentation/**` and `packages/ui/**` (story 0026-002+).
   - `no-deprecated-status-field` — flags `Identifier[name="status"]` accessed on a `Node`-typed expression. Backstop for `as any` / dynamic access escape hatches (story 0026-003).
3. **`pnpm format`** — prettier sweep.
4. **`grep` acceptance checks** — human-readable sanity on top of typecheck + lint, not the only guard. Story acceptance lists explicit greps but treats them as advisory if typecheck + lint pass.

### 10.2 Unit tests

- `derive-health.test.ts` — boundary cases on `HIGH_CPU`, `CRITICAL_CPU`, `HIGH_MEM`, `CRITICAL_MEM`. `unknown` when no runtime state. `critical` overrides on orchestration `down`.
- `drain-node.test.ts` — happy path, version conflict, drain + eligibility set together.
- `drain-cancel-node.test.ts` — `keepIneligible: true` retains ineligibility; `false` flips back to eligible.
- `set-eligibility.test.ts` — happy path, version conflict, errors on `drain.active=true` (drain owns eligibility).
- `set-lifecycle.test.ts` — illegal transitions throw `DomainException(ILLEGAL_LIFECYCLE_TRANSITION)`.
- `get-node-display-state.test.ts` — full precedence matrix + every input axis.

### 10.3 Integration tests

- `apps/server/__tests__/nodes-drain.test.ts` — 4 endpoints, 200 / 400 / 404 / 409.

### 10.4 End-to-end (Playwright)

- `apps/web/e2e/node-drain.spec.ts` — open detail, click Drain, set deadline, confirm, observe banner with countdown, cancel, verify chip flips back.

### 10.5 Manual smoke

1. `pnpm supabase:web:reset && pnpm supabase:web:typegen && pnpm dev`.
2. Open `/node/<id>` for any seed node.
3. Click Drain → set 30m deadline → confirm. Observe banner countdown.
4. Click Cancel drain. Observe banner gone, chip "Ineligible" persists (default `keepIneligible: true`).
5. Click eligibility chip → "Eligible". Observe chip flips.
6. Click Stop → observe lifecycle = stopping → eventually stopped.
7. Open topology page. Confirm `lifecycleCounts` + `healthCounts` show correct distributions.
8. Confirm pressure list uses new kinds (`unreachable` / `failing` etc).

## 11. i18n key map

### `nodes.json` additions (story 0026-002)

- `nodes.lifecycle.{provisioning,active,stopping,stopped,terminating,terminated}`
- `nodes.orchestration.{initializing,ready,down,disconnected}`
- `nodes.eligibility.{eligible,ineligible}`
- `nodes.drain.{title,description,deadline,deadlineNone,ignoreSystemJobs,force,startButton,cancelButton}`
- `nodes.drain.banner.{title,deadlineCountdown,deadlineNone,stalled,cancel}`
- `nodes.health.{healthy,degraded,critical,unknown}`
- `nodes.displayState.{inactive,unreachable,critical,draining,ineligible,degraded,running,pending}`

### `topology.json` additions

- `topology.pressure.kind.{unreachable,failing,highCpu,highMem,criticalHealth}`

### Removed (story 0026-003)

- `nodes.status.*`
- `topology.pressure.kind.down`

## 12. Implementation sequencing

```
Stage A — Domain + DB additive       (story 0026-001)
  ↓
Stage B — Switchover (writes new;    (story 0026-002)
           legacy column maintained
           by SQL trigger)
  ↓
Stage C — Drop deprecated            (story 0026-003)
```

Stage A is non-breaking. Stage B changes runtime read+write paths; the legacy `lifecycle_status` column is maintained by a SQL trigger as a projection — application code never writes it directly. Stage C atomically drops trigger + column + enum.

### 12.1 SQL-first invariant inside every story

Every story's first task is the SQL migration; consumers come later:

- 0026-001 task 1 = `47-node-state-decomposition.sql` (additive enums + columns + drain table + backfill).
- 0026-002 task 1 = `48-node-legacy-status-trigger.sql` (trigger + `pool_view` updated for new counts).
- 0026-003 task 1 = `49-node-state-cleanup.sql` (drop trigger → drop column → drop type).

CI runs `pnpm supabase:web:reset && pnpm supabase:web:typegen` before TypeScript checks. Drift between schemas and generated types becomes a compile-time error, fail loud.

Local-dev backstop: postinstall hook compares mtime of `apps/web/supabase/schemas/*.sql` against last `supabase:web:reset` timestamp; errors with "Run `pnpm supabase:web:reset && pnpm supabase:web:typegen` before `pnpm dev`" if drift detected. Implementation goes alongside story 0026-001 task 1.

## 13. Follow-ups (deferred)

- Bulk drain / bulk eligibility from `BulkActionBar` — phase 2.5.
- Audit log entries for state transitions — phase 6 (RFC 0030+).
- Configurable health thresholds (per organization) — phase 6.
- Real Nomad integration writing `orchestration` from observed runtime — phase 7+ (RFC 0031+).
- `reconnecting` value added to `NODE_ORCHESTRATION_STATES` when a real orchestrator surfaces it — phase 7+.

### 13.1 Production rollout for story 0026-003 (out of scope for `/finish`)

`/finish` merges story branches to local `main` atomically — no canary, no multi-deploy window. Production deploy of story 003's drop-deprecated changes requires explicit ordering:

1. **Deploy code that no longer reads `node.status` / `lifecycle_status`.** This is the application bundle from story 0026-003's TS commit.
2. **Verify in production** — error rates, traces, logs. Confirm no consumer is reading the soon-to-be-dropped column. Recommended verification window: 24 hours.
3. **Run the migration** that drops the trigger + column + enum (`49-node-state-cleanup.sql`).

Step 1 must be live and stable before step 2 runs. Reversing the order (or running them in a single deploy) leaves a window where production code reads from a column that's about to vanish.

CI guards the local `/finish` flow with `migrations.lock` precedence checks ensuring the SQL migration is the last thing applied within the story's commit. The production rollout sequencing above is operational discipline outside the codebase — documented here for the team that lands story 003 in prod.

---

## Changelog

(Empty — populated by `/finish-story` on first deviation.)
