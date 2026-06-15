# RFC 0026 — Node state decomposition

| Field      | Value                                                                              |
| ---------- | ---------------------------------------------------------------------------------- |
| Status     | Draft (v2 — amendments folded in 2026-04-27)                                       |
| Author     | Mohamed Aziz Ktata                                                                 |
| Created    | 2026-04-27                                                                         |
| Target     | Replace single `Node.status` enum with five orthogonal state axes                  |
| Supersedes | —                                                                                  |
| Related    | RFC 0025 (OPS compute refactor) ships first. Reference: `docs/research/nomad-node-management.md`. |

## 1. Summary

The `Node.status` enum collapses five orthogonal concerns — operator-driven lifecycle, observed orchestration, scheduling eligibility, drain progress, and derived health — into a single field. The result: the topology UI groups by `status` (wrong), the operator UI mutates fields the orchestrator should own (wrong), drain has no deadline (wrong), and every consumer reads the same enum for incompatible questions ("is it allocatable?" vs "did the operator stop it?"). RFC 0025 phase 1 scoped around the smell; phase 2 fixes its root.

This RFC introduces five separate fields on the `Node` entity, each with one owner and one meaning:

- **`lifecycle`** (operator-driven): `provisioning | active | stopping | stopped | terminating | terminated`. `active` (not `running`) — `running` reads as observed; lifecycle is intent.
- **`orchestration`** (observed by Nomad-class orchestrator): `unknown | initializing | ready | down | disconnected`. Default `unknown` until first heartbeat. `reconnecting` is a phase-7+ extension when a real orchestrator surfaces it.
- **`eligibility`** (operator intent, orthogonal to status): `eligible | ineligible`
- **`drain`** (operator intent + structured deadline): sub-object `{ active, deadline?, ignoreSystemJobs, force, startedAt?, completedAt? }`
- **`health`** (derived from heartbeat + utilization + orchestration): `healthy | degraded | critical | unknown`

Phase 2 ships the model in three stories — additive DB + domain, switchover, drop-deprecated — so existing data and existing UIs keep working while the migration progresses.

A presentation-only `getNodeDisplayState(node)` returns a single `NodeDisplayState` for badges. It is the only place a "what is this node doing right now" composite exists, and it lives in the UI layer, not in domain.

## 2. Motivation

The audit behind RFC 0025 found that "topology pool key uses status" — meaning topology grouped nodes by a field that mixes operator intent with observed state, so operator stops contaminate fleet topology. RFC 0025 worked around it by deriving pools from `(provider, region, node_pool)`. The deeper smell remains: the enum collapses five questions into one.

**Five questions, one field today:**

1. *Did the operator request this node be provisioned, active, stopped, or terminated?* — should be `lifecycle`
2. *Can the orchestrator schedule allocations on this node right now?* — should be `orchestration`
3. *Did the operator mark it ineligible for new placements (independent of state)?* — should be `eligibility`
4. *Is a drain in progress, with what deadline?* — should be `drain`
5. *Is it behaving correctly?* — should be `health` (derived)

Each question has a different owner. Lifecycle is operator-driven (UI writes). Orchestration is orchestrator-driven (UI reads only). Eligibility is operator intent. Drain is operator intent with a deadline. Health is computed.

Today's enum mixes them: `running` is both "operator wants it up" AND "orchestrator says ready" AND "healthy". `draining` is both "operator started a drain" AND "drain in progress". `error` is both "lifecycle failed" AND "health critical". The mixing means:

- The operator UI can write `running`, but `running` reads as observed truth — should be the orchestrator's domain. Renaming the operator-intent value to `active` fixes the semantic drift at its source.
- The topology UI uses `status` to group, but `status` mixes intent and state.
- Drain has no deadline — the data isn't there.
- Health is "stored" in `node_runtime_state.health`, but recompute would be the right model.

**Direct downstream wins:**

- Drain-with-deadline UX (operator can see "drain finishes in 18min").
- Eligibility chip (`ineligible` shown distinct from `running`).
- `disconnected` state distinct from `down` (Nomad's `lost_after` semantics — preserves allocations during transient network blips).
- Health computed, never stale.
- Topology stops mixing operator intent into pool aggregations.

Phase 1 (RFC 0025) is the structural prerequisite — typed `Pool`, `shell.fleet`, and the merged `@qlm/infrastructure` pkg. Phase 2 lands on top.

## 3. Goals and non-goals

### 3.1 Goals (phase 2)

- **G1.** `packages/domain/src/entities/node.type.ts` exposes five new fields: `lifecycle`, `orchestration`, `eligibility`, `drain`, `health`. The deprecated `status` field is removed by the end of phase 2.
- **G2.** `public.node` carries the new columns + a new `public.node_drain` table 1:1 with `node`. Three new Postgres enums: `node_lifecycle_state`, `node_orchestration_state`, `node_eligibility_state`. The deprecated `node_lifecycle_status` enum and `lifecycle_status` column are dropped at the end of phase 2.
- **G3.** Two new domain services: `DrainNodeService(input: DrainNodeInput)` and `SetNodeEligibilityService(input: SetEligibilityInput)`. Their input DTOs match Nomad's drain/eligibility shapes (deadline, ignoreSystemJobs, force, keepIneligible).
- **G4.** Two new server endpoints: `POST /api/nodes/:id/drain`, `POST /api/nodes/:id/eligibility`. Routes resolve project → org, validate via `zValidator`, call the domain services.
- **G5.** Shell-runtime `shell.nodes.drain(input)` and `shell.nodes.setEligibility(input)`. React Query mutations + cache invalidation.
- **G6.** Presentation: `getNodeDisplayState(node)` lives at `packages/features/ops/infrastructure/src/presentation/lib/get-node-display-state.ts`. `HealthStatusBadge` consumes it. Pool aggregations switch from `statusCounts` to `healthCounts` + `lifecycleCounts`. Topology fleet summary mirrors.
- **G7.** Health is computed in domain: `deriveNodeHealth(node, runtimeState, now)`. Pure function. Returns `'healthy' | 'degraded' | 'critical' | 'unknown'`. Used by adapter on read; never stored.
- **G8.** ESLint rule blocks `node.orchestration =` assignments outside adapters (i.e. UI cannot mutate orchestration).
- **G9.** Backwards-compatible during the migration window. Phase 2 story 0026-001 ships the new fields additively without dropping `status`. UI keeps reading `status` until story 0026-002. Story 0026-003 drops `status`.
- **G10.** `pnpm typecheck && pnpm test` green at every story boundary. Domain service tests for `DrainNodeService`, `SetNodeEligibilityService`, `deriveNodeHealth`.

### 3.2 Non-goals (phase 2)

- **Real Nomad integration.** Phase 2 keeps the orchestrator stub. The infra plane writing `orchestration: 'ready'` is mocked. RFC 0030+ wires real Nomad.
- **Workload (`Service`) domain port.** Phase 4 (RFC 0028). Per-node Services section stays empty-stub.
- **Real backend for replicas.** Phase 5 (RFC 0029).
- **Topology graph view.** Phase 3 (RFC 0027).
- **Audit log of state transitions.** Phase 6 — when SOC 2 attestation lands. Drain/eligibility events emit no audit entries in phase 2.
- **Bulk drain / bulk eligibility from BulkActionBar.** Phase 2.5 follow-up. Phase 2 ships single-node mutations only.

## 4. Prior art in the codebase

### Reused

- **`packages/domain/src/entities/node.type.ts`** — Zod-schema-then-Entity-class pattern. New fields slot in.
- **`packages/domain/src/services/node/`** — service pattern (constructor-injected repo, `execute(input)` returns DTO). New `DrainNodeService` + `SetNodeEligibilityService` mirror it.
- **`apps/web/supabase/schemas/43-platform-nodes-v2.sql`** — migration style (`DO $$ … END $$` enum-creation guards, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`). Phase 2 story 0026-001 follows the same shape.
- **`packages/repositories/supabase/src/node.repository.ts`** — adapter mapping conventions. Phase 2 extends with new fields.
- **`packages/shell-runtime/src/resources/nodes.ts`** — mutation pattern (`shell.nodes.changeStatus`). New `drain` / `setEligibility` mutations clone it.
- **`getNodeDisplayState`** — already exists conceptually as a switch over `node.status` inside `health-status-badge.tsx`. Phase 2 hoists it to a named pure helper.

### Replaced

- **`Node.status` field** — deleted at end of phase 2.
- **`HealthStatusBadge` switch over `status`** — switched to `getNodeDisplayState(node)`.
- **`Pool.statusCounts`** — renamed/split into `lifecycleCounts` and `healthCounts`. Topology presentation reads both.
- **`FleetSummary.statusCounts`** — same.
- **`PressurePoint.kind: 'down'`** — split into `'unreachable' | 'failing'` (orchestration vs lifecycle terminal failure).

### Orthogonal

- RLS policies on `public.node` — unchanged. New `node_drain` inherits the same policies.
- Auth, secrets — unchanged.
- Topology pool grouping (`provider, region, nodePool`) — unchanged. The fix is upstream: pool aggregations stop mixing operator intent.

## 5. Conceptual model

### 5.1 Five axes

```
Node
 ├── lifecycle      : operator intent, control-plane truth
 ├── orchestration  : observed by orchestrator (read-only from UI)
 ├── eligibility    : operator intent, orthogonal to lifecycle
 ├── drain          : operator intent + structured deadline (sub-object)
 └── health         : derived from metrics + orchestration + heartbeat
```

Each axis has one writer:

- **lifecycle** ← operator UI (`provision`, `stop`, `terminate` actions) + provisioner
- **orchestration** ← orchestrator only (Nomad / our infra plane)
- **eligibility** ← operator UI (`drain` action implicitly sets `ineligible`; `enable scheduling` action explicitly sets `eligible`)
- **drain** ← operator UI (`drain` / `cancel drain`)
- **health** ← computed; never written

### 5.2 Lifecycle transitions

```
            ┌──────────► provisioning
            │              │
            │              ▼
            │            active ◄─────┐
            │              │          │
operator ───┤              ▼          │
            │           stopping      │
            │              │          │
            │              ▼          │
            │           stopped ──────┘
            │              │ (operator restart)
            │              ▼
            │           terminating
            │              │
            └────────►  terminated  (irreversible)
```

`stopping` and `terminating` are TRANSIENT — they exist between an operator request and the agent's confirm. `stopped` is a stable resting state (reusable). `terminated` is IRREVERSIBLE (capacity returned).

**Naming rationale.** `active` over `running`: lifecycle is operator intent; `running` reads as observed state and would invite the same conflation we're fixing. `active` over `provisioned`: `provisioning → provisioned → active` is one extra transient state without a behavior change — `active` covers "intended to be up and serving."

### 5.3 Orchestration transitions

```
unknown ──► initializing ──► ready ──┬──► disconnected ──► down
                                     │
                                     └──► (back to ready when heartbeat returns)
```

`unknown` is the bootstrap value before the orchestrator has fingerprinted the node — distinct from `down` (it might come up). `disconnected` (Nomad's `lost_after` semantics) preserves allocations during transient network blips. `down` is hard-down — allocations are considered lost.

**Phase-7+ extension:** real Nomad telemetry surfaces `reconnecting` between `disconnected` and `ready`. Keeping the enum extensible. Not in phase 2.

### 5.4 Display state composite

The UI never renders five fields on a badge. `getNodeDisplayState(node)` is a pure function in the presentation layer that returns one of:

```ts
type NodeDisplayState =
  | 'inactive'      // lifecycle = terminated
  | 'unreachable'   // orchestration ∈ { down, disconnected }
  | 'critical'      // health = critical
  | 'draining'      // drain.active
  | 'ineligible'    // eligibility = ineligible (no active drain)
  | 'degraded'      // health = degraded
  | 'running'       // lifecycle = active ∧ orchestration = ready ∧ health = healthy
  | 'pending';      // catch-all (provisioning, stopping, terminating, unknown orchestration, etc.)
```

Precedence is intentional and tested. `inactive` wins because terminated nodes are gone — nothing else matters. `unreachable` wins next because we literally can't read its other state. `critical` health overrides all "everything is fine" signals. `draining` and `ineligible` are operator-aware states that distinguish "nothing's wrong, we just don't want new workloads here". `running` is the sunny path.

### 5.4a Invariants — `health` vs `displayState` (mandatory)

Two composites in the same RFC means they will get confused by future contributors unless the rules are loud:

- **`health`** is **pure telemetry**. Depends only on `runtimeState`, `orchestration`, `lastHeartbeatAt`, and the static thresholds. Never on `lifecycle`, `eligibility`, or `drain`. Computed deterministically from observable inputs.
- **`displayState`** is **UI abstraction**. Composes all five axes for badge rendering. Operator-aware (`draining`, `ineligible` carry intent).
- **Never persist `displayState`.** No DB column. No Zod schema field. No DTO. No JSON in `node_runtime_state`. It exists only as a function return value at render time.
- **Never use `displayState` in domain logic.** Domain services and queries read individual axes. `getNodeDisplayState` is presentation-layer only.
- **Never aggregate by `displayState`.** Pool exposes `lifecycleCounts` + `healthCounts`; never `displayStateCounts`. Same for FleetSummary, pressure-point classification, attention CTA filters.
- **`displayState` must be deterministic** given the five axes. No randomness, no time-based decay, no caller-supplied flags.

ESLint backstop: a custom rule `no-display-state-in-domain` errors on imports of `getNodeDisplayState` from any path other than `packages/features/**/presentation/**` and `packages/ui/**`. Lives next to `no-orchestration-write` in `tooling/eslint/rules/`.

### 5.5 Health derivation — single-node TS, aggregate SQL

`deriveNodeHealth` runs in two contexts. Both must produce identical answers.

**Single-node read path (TypeScript):**

```ts
// packages/domain/src/services/node/derive-health.ts
import { HEALTH_THRESHOLDS } from './health-thresholds';

export function deriveNodeHealth(
  node: Node,
  runtimeState: NodeRuntimeState | null,
  now: Date,
): NodeHealthState {
  if (!runtimeState || !node.lastHeartbeatAt) return 'unknown';
  if (node.orchestration === 'down' || node.orchestration === 'disconnected') {
    return 'critical';
  }
  if (
    runtimeState.cpuUtilPct >= HEALTH_THRESHOLDS.CPU_CRITICAL ||
    runtimeState.memUtilPct >= HEALTH_THRESHOLDS.MEM_CRITICAL
  ) {
    return 'critical';
  }
  if (
    runtimeState.cpuUtilPct >= HEALTH_THRESHOLDS.CPU_HIGH ||
    runtimeState.memUtilPct >= HEALTH_THRESHOLDS.MEM_HIGH
  ) {
    return 'degraded';
  }
  return 'healthy';
}
```

**Aggregate read path (SQL filters in `pool_view`):**

For pool / fleet rollups (potentially thousands of nodes), TS-side iteration is wasteful. The view computes `health_critical_count`, `health_degraded_count`, `health_healthy_count`, `health_unknown_count` directly:

```sql
COUNT(*) FILTER (
  WHERE rs.cpu_util_pct IS NULL
     OR n.last_heartbeat_at IS NULL
)                                                                   AS health_unknown_count,
COUNT(*) FILTER (
  WHERE n.orchestration IN ('down', 'disconnected')
     OR rs.cpu_util_pct >= 90
     OR rs.mem_util_pct >= 90
)                                                                   AS health_critical_count,
COUNT(*) FILTER (
  WHERE NOT (n.orchestration IN ('down', 'disconnected'))
    AND ((rs.cpu_util_pct >= 70 AND rs.cpu_util_pct < 90)
      OR (rs.mem_util_pct >= 70 AND rs.mem_util_pct < 90))
)                                                                   AS health_degraded_count,
-- healthy_count = nodeCount - critical - degraded - unknown
```

**Shared-constants discipline.** TS thresholds and SQL literals must never drift. Single source of truth:

```ts
// packages/domain/src/services/node/health-thresholds.ts
export const HEALTH_THRESHOLDS = {
  CPU_HIGH: 70,
  CPU_CRITICAL: 90,
  MEM_HIGH: 70,
  MEM_CRITICAL: 90,
} as const;
```

Test gate: `__tests__/services/node/health-thresholds-sql-parity.test.ts` reads `apps/web/supabase/schemas/47-node-state-decomposition.sql` (and `46-platform-pools.sql` after the pool-view update), greps for the literal numbers near `cpu_util_pct >= ` / `mem_util_pct >= `, asserts they match the TS constants. Fails CI if anyone edits one without the other.

Phase 2 hardcodes thresholds. Configurability per organization is RFC 0030+.

### 5.5a Drain ↔ eligibility — decoupled at the domain layer

Earlier draft auto-set `eligibility=ineligible` whenever `drain.active=true`, and disabled the eligibility chip during drain. That was a UI ergonomic posing as a domain invariant. **The model permits the cross-product; the domain must too.**

Rare-but-real cases the coupling broke:
- Operator wants drain *eventually* to succeed but keep the node accepting trickle traffic for shadow migration.
- Drain is paused operationally; eligibility flips back manually for a maintenance test.

**New shape:**
- `DrainNodeService` accepts `setIneligibleOnStart: boolean` (default `true`). When `true` (the recommended default), the service writes both the drain row AND `eligibility=ineligible` in one transaction. When `false`, only the drain row is written.
- `DrainCancelInput.keepIneligible` (already in the model) controls eligibility on cancel.
- Eligibility chip stays interactive during drain. UI labels it "Ineligible (drained)" when `drain.active ∧ eligibility=ineligible`, "Eligible despite drain" when `drain.active ∧ eligibility=eligible`. Operator can click to flip without affecting drain.

UI default behavior remains the common path. Domain stops forbidding the rare path.

### 5.6 Topology — what changes

- **Pool aggregations** switch from `statusCounts` to two counts:
  - `lifecycleCounts: Record<NodeLifecycleState, number>`
  - `healthCounts: Record<NodeHealthState, number>`
- **`PressurePoint.kind`** vocabulary expands:
  - `'unreachable'` (orchestration ∈ down/disconnected)
  - `'failing'` (lifecycle stopped/terminated/error path)
  - `'high-cpu'`, `'high-mem'` (health-derived)
  - `'critical-health'` (health = critical for any reason not covered above)
- **Attention CTA** filter changes from `status:in:[error,draining]` to `health:in:[critical] | drain.active=true | orchestration:in:[down,disconnected]`. URL filter spec rewrites accordingly.

### 5.7 ESLint guard

A custom rule in `tooling/eslint/`: `no-orchestration-write`. Errors on `node.orchestration =` assignments outside `packages/repositories/**` and `apps/server/**`. Prevents the regression where UI code starts writing the orchestrator's truth.

## 6. Architecture

### 6.1 New domain artifacts

- `packages/domain/src/entities/node-drain.type.ts` — `NodeDrainSchema`, `NodeDrain` type.
- `packages/domain/src/services/node/drain-node.usecase.ts` — `DrainNodeService`.
- `packages/domain/src/services/node/set-eligibility.usecase.ts` — `SetNodeEligibilityService`.
- `packages/domain/src/services/node/derive-health.ts` — pure `deriveNodeHealth` function.
- DTOs in `packages/domain/src/usecases/dto/node-usecase-dto.ts` extended with `DrainNodeInput`, `SetEligibilityInput`.

### 6.2 New repository port methods

```ts
abstract class INodeRepository extends RepositoryPort<Node, string> {
  // existing methods …
  abstract setLifecycle(id: string, lifecycle: NodeLifecycleState, expectedVersion: number): Promise<Node>;
  abstract setEligibility(id: string, eligibility: NodeEligibility, expectedVersion: number): Promise<Node>;
  abstract setDrain(id: string, drain: NodeDrain | null, expectedVersion: number): Promise<Node>;
}
```

`changeStatus` is removed at end of phase 2. Phase 2 story 0026-002 deprecates it (added during 0025); story 0026-003 deletes it.

### 6.3 New server endpoints

| Method | Path                                | Body                                                                                     |
| ------ | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| POST   | `/api/nodes/:id/drain`              | `{ deadline?: string; ignoreSystemJobs?: boolean; force?: boolean; setIneligibleOnStart?: boolean }` |
| POST   | `/api/nodes/:id/drain/cancel`       | `{ keepIneligible?: boolean }`                                                            |
| POST   | `/api/nodes/:id/eligibility`        | `{ eligibility: 'eligible' \| 'ineligible' }`                                             |
| POST   | `/api/nodes/:id/lifecycle`          | `{ lifecycle: 'active' \| 'stopping' \| 'stopped' \| 'terminating' }`                     |

`POST /api/nodes/:id/lifecycle` replaces the existing `changeStatus` endpoint. Phase 2 story 0026-002 ships both for the migration window; 0026-003 removes the old one.

### 6.4 New SQL

- `apps/web/supabase/schemas/47-node-state-decomposition.sql` (story 0026-001):
  - Three new enums: `node_lifecycle_state`, `node_orchestration_state`, `node_eligibility_state`.
  - Three new columns on `public.node`: `lifecycle`, `orchestration`, `eligibility`. (Health is computed, never stored.)
  - New table `public.node_drain` (1:1 with `node`).
  - Backfill UPDATE statement mapping old `lifecycle_status` → new `lifecycle` + `orchestration` + `eligibility`. Production runs the chunked variant (spec §6.1) to avoid long lock windows; local dev uses the single-statement form.
  - Old `lifecycle_status` column + enum kept.
- `apps/web/supabase/schemas/48-node-legacy-status-trigger.sql` (story 0026-002):
  - `sync_legacy_status_from_new_fields()` plpgsql trigger function with deterministic precedence (RFC §7.2).
  - `BEFORE INSERT OR UPDATE` trigger on `public.node`.
  - `pool_view` updated to expose `health_critical_count`, `health_degraded_count`, `health_healthy_count`, `health_unknown_count`, `lifecycle_*_count` per lifecycle value.
- `apps/web/supabase/schemas/49-node-state-cleanup.sql` (story 0026-003): `DROP TRIGGER` + `DROP FUNCTION` + `ALTER TABLE … DROP COLUMN lifecycle_status` + `DROP TYPE node_lifecycle_status`. Atomic in one migration.

### 6.5 Deletions (end of phase 2)

- `Node.status` field on the Zod schema.
- `node_lifecycle_status` Postgres enum.
- `node.lifecycle_status` column.
- `INodeRepository.changeStatus`.
- `POST /api/nodes/:id` body field `status`.
- `shell.nodes.changeStatus` resource method.
- `STATUS_TO_SQL` and `SQL_STATUS_TO_DOMAIN` mapping tables in `node.repository.ts`.

## 7. Phasing

### 7.1 Single-phase RFC, three-story sequence

```
Phase 2 — Node state decomposition

  0026-001  Domain + DB additive               — non-breaking
  0026-002  Adapter + presentation switchover  — flips reads + writes; old col is projection
  0026-003  Drop deprecated                    — removes status, old enum, old endpoint
```

Stories are sequential. 0026-002 must wait for 0026-001 to merge so the new fields exist in DB + domain. 0026-003 must wait for 0026-002 because dropping the old field requires that nothing reads it.

### 7.2 Dual-state mechanics (story 0026-002 only)

Earlier draft had adapters dual-write both directions. That doubles the bug surface — a partial write to one half corrupts the other. **Inverted: old `status` column becomes a trigger-maintained projection, never directly written by application code.**

- **Read path:** application code reads only the new fields. `node.status` is no longer in the domain Zod schema.
- **Write path:** application code writes only the new fields (`lifecycle`, `orchestration`, `eligibility`, `node_drain` row).
- **Old column maintenance:** a `BEFORE UPDATE` SQL trigger derives `lifecycle_status` from the new fields on every row mutation. Belt-and-braces protection in case any unmigrated reader still references the old column.
- **Trigger removal:** story 0026-003 drops the trigger atomically with the column.

**Trigger precedence (deterministic):** terminal lifecycle states win over observable states. Drain wins over orchestration-down (operator intent visible). Stopping is distinct from down.

```sql
CREATE OR REPLACE FUNCTION sync_legacy_status_from_new_fields()
RETURNS TRIGGER AS $$
DECLARE
  drain_active boolean;
BEGIN
  SELECT COALESCE(active, false) INTO drain_active
  FROM public.node_drain WHERE node_id = NEW.id;

  NEW.lifecycle_status :=
    CASE
      WHEN NEW.lifecycle = 'terminated'                              THEN 'terminating'  -- legacy enum has no 'terminated'
      WHEN NEW.lifecycle = 'terminating'                             THEN 'terminating'
      WHEN drain_active                                              THEN 'draining'
      WHEN NEW.orchestration IN ('down', 'disconnected')             THEN 'stopped'
      WHEN NEW.lifecycle = 'stopped'                                 THEN 'stopped'
      WHEN NEW.lifecycle = 'stopping'                                THEN 'draining'   -- closest legacy mapping
      WHEN NEW.lifecycle = 'active' AND NEW.orchestration = 'ready'  THEN 'running'
      WHEN NEW.lifecycle = 'provisioning'                            THEN 'provisioning'
      ELSE 'provisioning'
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER node_legacy_status_sync
BEFORE INSERT OR UPDATE ON public.node
FOR EACH ROW EXECUTE FUNCTION sync_legacy_status_from_new_fields();
```

The legacy enum has only `provisioning|running|draining|stopped|terminating|error` — fewer values than the new model. Mapping collapses transient `stopping` to `draining` (operationally similar from a legacy reader's POV) and `terminated` to `terminating` (the enum has no terminal state). Test fixture `precedence-table.test.sql` enumerates all 30+ tuples (lifecycle × orchestration × drain.active) and asserts the projected `lifecycle_status` matches the documented mapping.

### 7.3 Story-to-task allocation

Each story stays within `.claude/rules/spec-driven-dev.md`'s 1–8 task cap. Bugfix carve-outs reserved.

### 7.4 Migration ordering invariant

**SQL migrations always land before code that reads new columns/views, in every story.**

- Story 002 task 1 = run new SQL migration (adapter pool_view update + trigger). Tasks that consume new columns come later.
- CI runs `pnpm supabase:web:reset && pnpm supabase:web:typegen` before TypeScript checks any consumer. Generated types lagging the schema = compile-time error, fail loud.
- Local-dev backstop: postinstall hook compares mtime of `apps/web/supabase/schemas/*.sql` against last `supabase:web:reset` timestamp. Errors with "Run `pnpm supabase:web:reset && pnpm supabase:web:typegen` before `pnpm dev`" if drift detected.

### 7.5 Local-only `/finish` flow vs production rollout

`/finish` merges story branches to local `main` in one shot — no canary, no multi-deploy window. Everything lands atomically. RFC assumes this.

**Production rollout is a separate concern.** Story 0026-003 cannot ship to a real environment in a single deploy without ordering:

1. Deploy code that no longer reads `node.status` / `lifecycle_status`.
2. Verify in production (logs, traces, error rates).
3. Run the migration that drops the trigger + column + enum.

Step 1 must be live and stable before step 2 runs. Spec §13 captures the production rollout note + flags this as out of scope for the local-only `/finish` flow.

### 7.6 Future phases

| Phase | RFC      | Capability                                                                                                         |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| 3     | 0027     | True topology graph view (Reactflow nesting).                                                                      |
| 4     | 0028     | Workload (`Service`) domain port + per-node Services section real data.                                            |
| 5     | 0029     | Replicas standalone app + real Supabase backend.                                                                   |
| 6     | 0030+    | Audit log of node state transitions; configurable health thresholds; bulk drain / bulk eligibility.                |
| 7     | 0031+    | Real Nomad integration (or our infra-plane equivalent) writing `orchestration` from observed runtime data.         |

## 8. Open questions

All resolved at RFC time. The phase-2 spec's §1 mirrors this section.

1. **Drain modeled as a 4th axis (sub-object on Node) or its own entity (1:1 table)?** Resolution: **separate table `public.node_drain`, mapped to a sub-object on the domain `Node`.** Drain has its own write pattern (operator action), its own lifecycle (active → completed), and its own retention semantics ("show drain history for 24h"). Putting it on `node` itself would force four nullable columns on every node row.
2. **Eligibility — 5th axis or fold into orchestration?** Resolution: **5th axis.** Eligibility is operator intent ("don't schedule here"); orchestration is observed state ("agent says it's ready"). A node can be `ready ∧ ineligible` (drain enabled, agent fine, no new placements) — no value of orchestration alone captures that.
3. **Lifecycle: value naming — `running` vs `active`?** Resolution: **`active`.** `running` reads as observed state, conflating intent with observation. `active` is unambiguous. **State diagram §5.2 + naming rationale documented.**
4. **Lifecycle transition semantics.** Resolution: **`stopping` is transient (operator requested stop, agent not yet confirmed); `stopped` is stable (agent off, machine reusable); `terminating` transient; `terminated` irreversible (capacity returned).**
5. **Health enum: keep `unknown`?** Resolution: **yes.** `unknown` covers the bootstrap window before any metrics report. Distinct from `healthy` (positive signal) and `degraded` (negative signal). `offline` from the old enum is dropped — redundant with `orchestration: 'down'`.
6. **Orchestration enum membership — bootstrap state?** Resolution: **add `unknown` as the default before first heartbeat.** Distinct from `down` (might come up). `reconnecting` between `disconnected` and `ready` deferred to phase 7+ when a real orchestrator surfaces it. Five values total: `unknown | initializing | ready | down | disconnected`.
7. **`PressurePoint.kind: 'down'` rewrite.** Resolution: **split into `'unreachable'` (orchestration ∈ down/disconnected) and `'failing'` (lifecycle terminal failure).** New kinds: `'unreachable' | 'failing' | 'high-cpu' | 'high-mem' | 'critical-health'`.
8. **Migration backfill mapping.** Resolution: **case-by-case from existing `lifecycle_status`:**
   - `provisioning` → `lifecycle=provisioning, orchestration=initializing, eligibility=eligible, drain=null`
   - `running` → `lifecycle=active, orchestration=ready, eligibility=eligible, drain=null`
   - `draining` → `lifecycle=active, orchestration=ready, eligibility=ineligible, drain={active:true, ...}`
   - `stopped` → `lifecycle=stopped, orchestration=down, eligibility=eligible, drain=null`
   - `terminating` → `lifecycle=terminating, orchestration=down, eligibility=ineligible, drain=null`
   - `error` → `lifecycle=stopped, orchestration=down, eligibility=ineligible, drain=null`
   Health is derived on read; never backfilled.
9. **Health derivation thresholds + parity TS↔SQL.** Resolution: **hardcoded constants in `packages/domain/src/services/node/health-thresholds.ts` (`CPU_HIGH=70, CPU_CRITICAL=90, MEM_HIGH=70, MEM_CRITICAL=90`).** SQL filter expressions in `pool_view` use the same numeric values; CI test parses the SQL file and asserts parity. Configurability is phase 6.
10. **Single-node vs aggregate health derivation.** Resolution: **single-node read uses `deriveNodeHealth(...)` TypeScript pure function; aggregate views use SQL `FILTER` expressions in `pool_view` + similar.** Documented §5.5.
11. **`getNodeDisplayState` precedence.** Resolution: **inactive > unreachable > critical > draining > ineligible > degraded > running > pending.** Tested in `get-node-display-state.test.ts`.
12. **`displayState` vs `health` invariants.** Resolution: **`health` is pure telemetry; `displayState` is UI abstraction.** Never persist `displayState`. Never use it in domain logic. Never aggregate by it. ESLint rule `no-display-state-in-domain` enforces. Documented §5.4a.
13. **Drain and eligibility coupling.** Resolution: **decoupled at the domain layer.** `DrainNodeService.execute({setIneligibleOnStart: true})` is the recommended UI default. Operator can drain without flipping eligibility, or flip eligibility independently during a drain. Documented §5.5a.
14. **Dual-write direction during the migration window.** Resolution: **inverted from earlier draft.** Application code reads + writes new fields only. Old `lifecycle_status` column = trigger-maintained projection (`sync_legacy_status_from_new_fields()` BEFORE UPDATE). Eliminates the partial-write divergence risk. §7.2.
15. **Trigger precedence (legacy projection).** Resolution: **deterministic precedence table** — terminal lifecycle wins over observable; drain wins over orchestration-down; transitional states distinct from terminal. Full SQL body in §7.2.
16. **Bulk drain / bulk eligibility.** Resolution: **deferred to phase 2.5.** Phase 2 ships single-node mutations only.
17. **Audit log entries for drain / eligibility / lifecycle changes.** Resolution: **deferred to phase 6.** Phase 2 doesn't emit audit events; SOC 2 attestation drives that work.
18. **Verification ordering — how do we know `node.status` is gone?** Resolution: **typecheck > lint > grep, in that order.** Type system catches the bulk (drop the field from the Zod schema → every reference compile-errors). ESLint custom rule `no-deprecated-status-field` backstops escape hatches (`as any`, dynamic indexing). `grep` is the human-readable acceptance check on top, not the only check.
19. **SQL migration ordering inside a story.** Resolution: **task 1 = migration; consumers come later.** CI runs `pnpm supabase:web:reset && pnpm supabase:web:typegen` before TypeScript checks. Local dev: postinstall hook detects schema-mtime drift and errors loudly. §7.4.
20. **Local-only `/finish` flow vs production rollout.** Resolution: **RFC assumes local-only for `/finish`; production rollout flagged separately in spec §13.** Production deploy of story 003 requires step-1-then-step-2 ordering (deploy code → migrate); CI enforces via `migrations.lock` precedence checks.

## 9. Alternatives considered

- **Keep one enum, add new values.** Rejected. The smell is the conflation, not the size of the enum. Adding `disconnected` and `terminated` to a single enum just hides the 5-question problem inside a wider type.
- **Make `health` a stored field (UPDATE on observation).** Rejected. Stored health drifts. Today's adapter has a `health` column on `node_runtime_state` that goes stale if the writer crashes mid-update. Recompute is cheaper and never lies.
- **Use a state machine library (xstate) for lifecycle.** Rejected for phase 2. Lifecycle has six states and clear transitions; the state diagram fits in the comment block above. xstate adds a dep + indirection without solving a problem we have. Revisit if phase 6's audit log + transition guards justify it.
- **Drop `eligibility` and overload `drain.active`.** Rejected. Operators set `ineligible` for reasons unrelated to drains (e.g. cordon for maintenance, planned upgrade window). Conflating them re-creates today's smell.
- **Single big breaking PR instead of three stories.** Rejected. The DB enum recreate-dance plus the adapter rewrite plus the presentation rewrite would be ungestable. The three-story split keeps each commit reviewable.
- **Defer the migration; introduce only the ESLint guard + typed wrappers.** Rejected. The smell ships in production data; reading from the wrong field is a real bug, not a stylistic preference.

## 10. References

### Internal

- `.claude/rules/hexagonal-architecture.md`
- `.claude/rules/database.md`
- `.claude/rules/spec-driven-dev.md`
- `.claude/rules/clean-code.md`
- `docs/research/nomad-node-management.md` — 5-axis Zod definitions, DB delta, migration impact.
- `docs/rfcs/0025-ops-compute-refactor.md` — phase 1 prerequisite.
- `apps/web/supabase/schemas/43-platform-nodes-v2.sql` — current schema baseline.
- `packages/domain/src/entities/node.type.ts` — entity to refactor.

### External

- HashiCorp Nomad node API + drain/eligibility commands (URLs in `nomad-node-management.md` §5).
- OWASP ASVS — applicability of structured state for audit log eligibility (phase 6 prep).

---

## Review checklist for the author

- [x] Does §1 make the scope obvious in one paragraph? — Yes; five axes named, three stories, deferred items pinned.
- [x] Is every §3.1 goal an observable exit criterion? — G1–G10 all checkable with `grep` / SQL / typecheck / browser.
- [x] Is every §3.2 non-goal pinned to a named future phase? — Real Nomad → 0030+; workload → 0028; topology graph → 0027; replicas → 0029; audit log → 0030+.
- [x] Does §4 distinguish reused prior art from replaced prior art? — Yes; three subsections.
- [x] Would a newcomer understand the concept after reading only §1 through §5? — §5 establishes the five axes, the transition diagrams, the display-state composite, and the topology impact.
- [x] Are the open questions real decisions, or are any of them placeholders? — All ten resolved with concrete rationale.
- [x] Does the rollout plan match realistic engineering capacity for the next quarters? — Three sequential stories, each ≤8 tasks; phase 2 is ~2–3 weeks.
- [x] Does every alternative in §9 have a concrete reason it was not chosen? — Six alternatives; each rejected with cause.
