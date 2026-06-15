# Nomad node-management — domain reference

| Field    | Value                                                  |
| -------- | ------------------------------------------------------ |
| Status   | Reference                                              |
| Created  | 2026-04-27                                             |
| Updated  | 2026-04-27 (revised for 5-axis decomposition adoption) |
| Sources  | HashiCorp Nomad public docs (URLs cited inline)        |
| Used by  | RFC 0026 — Node state decomposition                    |

We are NOT running Nomad. This note distills Nomad's battle-tested node-management vocabulary so our domain enums and node entity stop being thin and ambiguous. Fidelity matters less than conceptual alignment.

---

## 1. Nomad's five orthogonal axes

Nomad separates node management into five axes. Our current model collapses them into one `status` enum, which is the root cause of the audit's "status drift" finding.

### 1.1 Lifecycle status (observed)

API field: `Status`. Values: `initializing`, `ready`, `down`, `disconnected`. Source: `nomad node status` and the Nomad nodes HTTP API.

| Value          | Meaning                                                                  | Origin                |
| -------------- | ------------------------------------------------------------------------ | --------------------- |
| `initializing` | Registered, fingerprinting drivers, not yet ready to accept allocations  | observed              |
| `ready`        | Heartbeating, ready to receive allocations                               | observed              |
| `down`         | Heartbeat lost; allocations marked `lost` and replaced                   | observed              |
| `disconnected` | Heartbeat lost with `disconnect.lost_after` set; allocs marked `unknown` | observed              |

> "When `lost_after` is specified, the Nomad server will mark clients that fail to heartbeat as 'disconnected' rather than 'down', and will mark allocations on a disconnected client as 'unknown' rather than 'lost'."
> — [`disconnect` block](https://developer.hashicorp.com/nomad/docs/job-specification/disconnect)

The CLI mixes `Ineligible` and `Draining` into the status column for convenience. **In the API they are separate fields.** They are not lifecycle states.

### 1.2 Scheduling eligibility (operator intent)

API field: `SchedulingEligibility`. Values: `eligible`, `ineligible`.

> "By default nodes are eligible for scheduling meaning they can receive placements and run new allocations. Nodes that have their scheduling eligibility disabled are ineligible for new placements."
> — [`nomad node eligibility`](https://developer.hashicorp.com/nomad/commands/node/eligibility)

> "The `node drain` command automatically disables eligibility. Disabling a drain restores eligibility by default."

Operator-set explicitly via `-enable`/`-disable`, or implicitly by `node drain`.

### 1.3 Drain state (operator intent + deadline)

API field: `DrainStrategy` (object). Shape:

```json
{ "DrainSpec": { "Deadline": 3600000000000, "IgnoreSystemJobs": true }, "Meta": {...} }
```

Verbatim flag semantics from [`nomad node drain`](https://developer.hashicorp.com/nomad/commands/node/drain):

- `-deadline`: "Set the deadline by which all allocations must be moved off the node. Remaining allocations after the deadline are removed from the node, regardless of their migrate block. Defaults to 1 hour."
- `-no-deadline`: "No deadline allows the allocations to drain off the node, ignoring the default 1 hour deadline."
- `-ignore-system`: "Ignore system allows the drain to complete without stopping system job allocations. By default system jobs (and CSI plugins) are stopped last."
- `-force`: "Remove allocations off the node immediately, regardless of the allocation's migrate block."
- `-keep-ineligible`: "Keep ineligible will maintain the node's scheduling ineligibility even if the drain is being disabled."

Drain transitions: enabling drain → eligibility automatically becomes `ineligible` → allocations migrate within deadline → drain completes → eligibility **stays ineligible** unless explicitly re-enabled (prevents refilling).

### 1.4 Heartbeat / health

API exposes `LastHeartbeat`, `HeartbeatTTL`, `StatusUpdatedAt`. Nomad has **no separate health enum** — health is collapsed into `down`/`disconnected`. Callers compute their own freshness.

### 1.5 Grouping: node pool, datacenter, node class

Three orthogonal grouping fields.

> **Node Pool**: "Node pools are used to group nodes and can be used to restrict which jobs are able to place allocations in a given set of nodes."
> — [glossary](https://developer.hashicorp.com/nomad/docs/glossary)

> "Node pools allow grouping clients and segment infrastructure into logical units so that jobs control allocation placement."
> — [node-pools concepts](https://developer.hashicorp.com/nomad/docs/concepts/node-pools)

> "Nomad automatically creates a built-in `default` node pool. The `node_pool` attribute in both the client configuration and job files are optional."

| Field        | Role                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| `NodePool`   | placement boundary — jobs select a pool                                  |
| `Datacenter` | regional bucket                                                          |
| `NodeClass`  | free-form label for affinity/constraint rules                            |

**Yes — node pool is first-class in Nomad.** Our audit finding ("Pool exists only client-side") aligns with this gap.

---

## 2. DB ↔ Domain ↔ Nomad delta

| Concept              | DB (`43-platform-nodes-v2.sql`)                                                | Domain (`node.type.ts`)                       | Nomad                                          | Verdict                                                       |
| -------------------- | ------------------------------------------------------------------------------ | --------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| Lifecycle status     | `node_lifecycle_status`: `provisioning, running, draining, stopped, terminating, error` | `running, draining, stopped, error`           | `initializing, ready, down, disconnected`      | **All three disagree.** DB and domain conflate intent + lifecycle. Nomad keeps lifecycle pure. |
| Scheduling eligibility | not modeled                                                                  | not modeled                                   | `eligible \| ineligible`                       | **Missing in both.** Must add.                                |
| Drain state          | only the `draining` enum value (boolean-ish)                                   | only the `draining` status value              | structured `Drain: bool, DrainStrategy: {...}` | **Missing structured drain.** Has a deadline + flags.         |
| Health               | `node_health`: `healthy, warning, critical, offline, unknown`                  | `healthy, degraded, down, unknown`            | conflated into lifecycle                        | DB and domain disagree. Nomad doesn't expose this. **Align DB↔domain.** |
| Heartbeat freshness  | `node_runtime_state.last_seen_at`                                              | `lastSeenAt: string`                          | `LastHeartbeat`, `HeartbeatTTL`                 | OK — keep.                                                    |
| Pool                 | `node.node_pool` (varchar, indexed) + `node.node_type` (`public/private`)      | not modeled (only `cluster`)                  | `NodePool` (string)                             | **Domain missing.** Expose as `nodePool`. Deprecate `cluster`. |
| Datacenter / region  | `region`                                                                       | `region` (enum)                               | `Datacenter`                                    | naming differs but maps cleanly.                              |
| Node class           | not modeled                                                                    | `kind` (instance type)                        | `NodeClass` (free-form)                         | Our `kind` is closer to instance type. Skip Nomad's NodeClass — YAGNI. |

`provisioning` and `terminating` are operator-driven lifecycle phases that have no Nomad equivalent — Nomad's lifecycle is observed-only. We're modeling a **provisioning workflow** plus an observed compute fleet, so keeping `provisioning`/`terminating` is correct for our domain — but they should sit alongside Nomad-style states like `ready`, not replace them.

---

## 3. Recommended Zod enums + Node fields — 5-axis model

The single `status` enum collapsed five orthogonal concerns into one axis. RFC 0026 replaces it with five separate fields: **lifecycle**, **orchestration**, **eligibility**, **drain**, **health**. Each has a single owner and a single meaning.

```ts
// ============================================================
// Axis 1 — Lifecycle (operator-driven, control-plane truth)
// ============================================================
// Phases of the node's life inside our orchestration system.
// Operator UI mutates these via `provision`, `stop`, `terminate`.
//
// `stopping` and `terminating` are TRANSIENT — they exist between an
// operator request and the agent's confirm. `stopped` is a stable
// resting state (agent off, machine reusable). `terminated` is
// IRREVERSIBLE — disk wiped, capacity returned, never reused.
export const NODE_LIFECYCLE_STATES = [
  'provisioning',  // capacity claimed, agent not yet started
  'running',       // operator wants it up
  'stopping',      // transient: operator requested stop
  'stopped',       // stable: agent off, machine reusable
  'terminating',   // transient: operator requested decommission
  'terminated',    // irreversible: machine gone
] as const;
export type NodeLifecycleState = (typeof NODE_LIFECYCLE_STATES)[number];

// ============================================================
// Axis 2 — Orchestration (observed by the orchestrator)
// ============================================================
// Mirrors Nomad's node Status. The orchestrator (Nomad/our infra
// plane) writes this; UI never does. Answers "can this node accept
// allocations right now?".
//
// `disconnected` (Nomad `lost_after` model) is distinct from `down`:
// the agent missed a heartbeat but allocations may still be running.
export const NODE_ORCHESTRATION_STATES = [
  'initializing',  // registered, fingerprinting drivers
  'ready',         // heartbeating, accepting allocations
  'down',          // heartbeat lost, allocations considered lost
  'disconnected',  // heartbeat missed within `lost_after` window
] as const;
export type NodeOrchestrationState = (typeof NODE_ORCHESTRATION_STATES)[number];

// ============================================================
// Axis 3 — Scheduling eligibility (operator intent, orthogonal)
// ============================================================
// Matches Nomad's `SchedulingEligibility`. A `ready` node can be
// `ineligible` — it heartbeats fine but receives no new placements
// (typically because a drain is enabled).
export const NODE_ELIGIBILITY_STATES = ['eligible', 'ineligible'] as const;
export type NodeEligibility = (typeof NODE_ELIGIBILITY_STATES)[number];

// ============================================================
// Axis 4 — Drain (operator intent + deadline, structured)
// ============================================================
// Matches Nomad's DrainStrategy. Sub-object on Node — present
// whenever `active=true` or within a retention window post-drain so
// the UI can show "drained 2 min ago".
export const NodeDrainSchema = z.object({
  active: z.boolean(),
  deadline: z.string().optional()
    .describe('ISO timestamp when allocations must be moved; absent = no-deadline'),
  ignoreSystemJobs: z.boolean().default(false),
  force: z.boolean().default(false)
    .describe('Remove allocations immediately, ignoring migrate block'),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});
export type NodeDrain = z.infer<typeof NodeDrainSchema>;

// ============================================================
// Axis 5 — Health (derived, UI affordance)
// ============================================================
// Computed from heartbeat freshness + utilization + orchestration
// state. NEVER stored manually. `unknown` covers the bootstrap window
// before any metrics report. `offline` from the old enum collapses
// into `orchestration: 'down'` — they're the same fact.
export const NODE_HEALTH_STATES = [
  'healthy',
  'degraded',
  'critical',
  'unknown',
] as const;
export type NodeHealthState = (typeof NODE_HEALTH_STATES)[number];

// ============================================================
// Schema additions on Node
// ============================================================
export const NodeSchema = z.object({
  // ... existing identity + capacity fields ...
  lifecycle: z.enum(NODE_LIFECYCLE_STATES).default('provisioning'),
  orchestration: z.enum(NODE_ORCHESTRATION_STATES).optional()
    .describe('Observed state — undefined until first heartbeat'),
  eligibility: z.enum(NODE_ELIGIBILITY_STATES).default('eligible'),
  drain: NodeDrainSchema.optional(),
  health: z.enum(NODE_HEALTH_STATES).default('unknown'),
  nodePool: z.string().default('default')
    .describe('Placement boundary — Nomad NodePool'),
  lastHeartbeatAt: z.string().optional(),
  heartbeatTtlSeconds: z.number().int().positive().optional(),
  // The old `status` field is REMOVED in phase 2 story 0026-003.
});
```

Naming: `nodePool` not `pool` (Nomad convention + no collision with connection-pool); `eligibility` not `schedulingEligibility` (every Node field is by definition about scheduling).

### Domain rules — enforced by the type system + lint

1. `orchestration` is **never** written by UI code. It's read-only from the orchestrator. ESLint custom rule blocks UI mutations.
2. `lifecycle` is the only writable axis from operator UI (`provision`, `stop`, `terminate`).
3. `health` is `derive(metrics, orchestration, lastHeartbeatAt)` — pure function, never stored.
4. **Topology never groups by `lifecycle`.** Pools group by `(provider, region, nodePool)`. Topology pool aggregations expose `healthCounts` + `lifecycleCounts` separately.
5. `getNodeDisplayState(node)` is a UI-only composite for badge rendering — never stored, never persisted, never returned from domain services.

### UI-only composite (presentation glue)

```ts
// packages/features/ops/infrastructure/src/presentation/lib/get-node-display-state.ts
export type NodeDisplayState =
  | 'inactive'      // lifecycle = terminated
  | 'unreachable'   // orchestration = down or disconnected
  | 'critical'      // health = critical
  | 'degraded'      // health = degraded
  | 'draining'      // drain.active = true
  | 'ineligible'    // eligibility = ineligible (no drain)
  | 'running'       // lifecycle = running, orchestration = ready, healthy
  | 'pending';      // catch-all

export function getNodeDisplayState(node: Node): NodeDisplayState {
  if (node.lifecycle === 'terminated') return 'inactive';
  if (node.orchestration === 'down' || node.orchestration === 'disconnected')
    return 'unreachable';
  if (node.health === 'critical') return 'critical';
  if (node.drain?.active) return 'draining';
  if (node.eligibility === 'ineligible') return 'ineligible';
  if (node.health === 'degraded') return 'degraded';
  if (node.lifecycle === 'running' && node.orchestration === 'ready') return 'running';
  return 'pending';
}
```

---

## 4. Migration impact

### 4.1 What breaks

1. **`NODE_STATUSES` membership change.** Old: `running|draining|stopped|error`. New: 8 values, and `running` is renamed to `ready`. Any switch on status — JSX badge maps, route filters, MSW fixtures, test factories — breaks at compile time. The intentional rename catches every site.
2. **`draining` is no longer a status.** It moves to `drain.active === true`. Any `status === 'draining'` predicate must read `drain?.active`. UI badges that show "Draining" derive from the drain object.
3. **DB enum mismatch.** `node_lifecycle_status` ENUM has `provisioning|running|draining|stopped|terminating|error`. Plan:
   - Add `initializing`, `ready`, `disconnected`, `down` (`ALTER TYPE … ADD VALUE`).
   - Backfill: `running → ready`, `draining` rows get a row in a new `node_drain` table and their status becomes `ready` (eligibility=ineligible, drain.active=true).
   - Postgres ENUMs cannot drop values in-place; deprecate `draining` first, migrate data, then a follow-up migration drops it.
4. **Health enum mismatch.** Domain has `degraded`, DB has `warning|critical`. Recommendation: **adopt DB's set** in domain. Cheaper than altering Postgres ENUMs.

### 4.2 Files affected

| Layer            | File(s)                                                                            | Change                                                        |
| ---------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Domain           | `packages/domain/src/entities/node.type.ts`                                        | New enums, drain schema, fields. Defaults in `NodeEntity.create`: `status: 'provisioning'`, `eligibility: 'eligible'`, `drain: undefined`, `nodePool: 'default'`. |
| Domain DTOs      | `packages/domain/src/usecases/dto/*.ts`                                             | Optional `nodePool` on Create/Update. Drain mutations are their own use cases (`DrainNodeService`, `SetNodeEligibilityService`) — do not shoehorn into UpdateNode. |
| DB               | new `apps/web/supabase/schemas/44-node-eligibility-drain.sql`                       | Add new ENUM values, new `node_scheduling_eligibility` ENUM, new `node_drain` table. Set default on `node.node_pool`. Align `node_health`. |
| DB types         | `database.types.ts`                                                                 | Auto-regenerated via `pnpm supabase:web:typegen`.            |
| Server adapter   | `apps/server/src/lib/node-repository.stub.ts`, Supabase adapter                     | Map new columns; expose `drainNode(id, spec)`, `setEligibility(id, value)`. |
| HTTP adapter     | `apps/web/src/lib/repositories/node.repository.ts`                                  | Same surface as server adapter.                              |
| Repository port  | `packages/domain/src/repositories/node-repository.port.ts`                          | Add `drain(input)`, `setEligibility(input)`.                  |
| Server routes    | `apps/server/src/routes/nodes.ts`                                                   | Add `POST /nodes/:id/drain`, `POST /nodes/:id/eligibility`.   |
| Shell runtime    | `packages/shell-runtime/src/resources/nodes.ts`                                     | Expose `shell.nodes.drain(...)`, `shell.nodes.setEligibility(...)`. |
| Presentation     | `packages/features/ops/nodes/src/presentation/cells/health-status-badge.tsx`        | Status palette grows from 4 → 8. Rename `running → ready`. New badge for `disconnected` (amber). Drain becomes a separate visual indicator (inline pill on top of status). |
| Presentation     | `node-card.tsx`, `node-details-sheet.tsx`                                           | Show eligibility chip when `ineligible`; drain banner with deadline countdown when `drain.active`. |
| i18n             | `apps/web/src/lib/i18n/locales/en/nodes.json` (or merged `infrastructure.json`)     | New keys: `status.initializing`, `status.ready`, `status.disconnected`, `status.down`, `eligibility.eligible|ineligible`, `drain.active`, `drain.deadline`, `drain.ignoreSystemJobs`. |
| MSW              | `apps/web/src/lib/msw/handlers/nodes.ts`                                            | Fixtures need new shape; add `disconnected` and `ineligible+draining` fixtures so the UI gets exercised. |
| Tests            | `packages/domain/__tests__/services/node/*`                                         | Domain services for `drainNode` and `setEligibility`. Status-transition tests update to the 8-value enum. |
| Storybook        | `packages/features/ops/nodes/.../*.stories.tsx`                                     | Stories per status (incl. new ones), per drain state, per eligibility. |

### 4.3 What stays clean

- `node_runtime_state` table is unaffected — already separates fast-changing observability from stable identity, exactly the split Nomad uses (`StatusUpdatedAt` vs `Status`).
- `version` column / optimistic concurrency stays.
- RLS policies untouched — eligibility/drain don't change the access model.

### 4.4 Sequencing — three stories (RFC 0026)

1. **Domain + DB additive.** Add `node_lifecycle_state`, `node_orchestration_state`, `node_eligibility_state` enums; add `lifecycle / orchestration / eligibility / health` columns to `public.node`; create `public.node_drain` (1:1 with `node`). Backfill from existing `status` (e.g. `running` → `lifecycle=running, orchestration=ready, eligibility=eligible`). The old `status` column stays. Domain Zod schemas gain the new fields as optional. Non-breaking.
2. **Adapter + presentation switchover.** Adapters write the new fields; presentation reads them. `getNodeDisplayState` powers badges. Pool aggregations switch from `statusCounts` to `lifecycleCounts` + `healthCounts`. MSW fixtures + Storybook + tests rewrite. The old `status` field stops being read but remains in the DB.
3. **Drop deprecated.** Remove `status` column + old `node_status`/`node_lifecycle_status` enums (Postgres recreate-enum dance). Trim Node Zod schema. Final cleanup commit.

---

## 5. Sources

- [Nomad glossary](https://developer.hashicorp.com/nomad/docs/glossary)
- [Nodes HTTP API](https://developer.hashicorp.com/nomad/api-docs/nodes)
- [`nomad node drain`](https://developer.hashicorp.com/nomad/commands/node/drain)
- [`nomad node eligibility`](https://developer.hashicorp.com/nomad/commands/node/eligibility)
- [`nomad node status`](https://developer.hashicorp.com/nomad/commands/node/status)
- [`disconnect` block](https://developer.hashicorp.com/nomad/docs/job-specification/disconnect)
- [Node pools concept](https://developer.hashicorp.com/nomad/docs/concepts/node-pools)
- Local: `apps/web/supabase/schemas/43-platform-nodes-v2.sql`
- Local: `packages/domain/src/entities/node.type.ts`
