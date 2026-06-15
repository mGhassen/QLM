# RFC 0025 — OPS compute refactor

| Field      | Value                                                                                |
| ---------- | ------------------------------------------------------------------------------------ |
| Status     | Draft                                                                                |
| Author     | Mohamed Aziz Ktata                                                                   |
| Created    | 2026-04-27                                                                           |
| Target    | Three-app OPS surface — Topology, Infrastructure, Integrations + Replicas            |
| Supersedes | —                                                                                    |
| Related    | RFC 0024 (Global Shell UI). Reference: `docs/research/nomad-node-management.md`.     |

## 1. Summary

The OPS surface ships three apps — **Topology** (fleet observability), **Infrastructure** (per-node operations), **Integrations** (cloud connectivity) — plus a **Replicas** placement primitive. A post-implementation audit found that runtime wiring contradicts intent: the `@guepard/infrastructure` feature package is dead code, the `@guepard/nodes` feature package is what actually mounts at `/infrastructure`, fleet aggregations are duplicated across topology and the dead infrastructure feature, "Pool" is faked client-side, the `tid:` virtual-tab protocol is an untyped string convention, and replicas leak into Infrastructure as a Settings tab next to node CRUD.

This RFC scopes the consolidation. Phase 1 ships:

- A **typed `TabId`** discriminated union in `@guepard/shell-contracts`, replacing inline `tid:` string parsing.
- **Pool as a domain entity** (`PoolEntity` + `IPoolRepository` + `ListPoolsByProjectService`), backed by a Postgres VIEW over `public.node.node_pool` (no new table for phase 1).
- **`shell.fleet` runtime resource** exposing `summary | pools | pressurePoints` from a `FleetAggregateService` in domain.
- **Package rename + merge**: `@guepard/nodes` → `@guepard/infrastructure` (canonical name), absorbing the activity + settings + replicas surfaces from the dying pkg, deleting the cluster/provider tabs (now redundant with Topology + Pool entity).
- **Per-node detail sections** (Services / Storage / CPU / Memory) confirmed as scrollable sections, not tabs, in the merged pkg.

Phase 2 deferred:

- Nomad-aligned `NODE_STATUSES` extension (`provisioning|initializing|ready|disconnected|down|terminating|stopped|error`), `eligibility`, structured `drain`, `lastHeartbeatAt`. Tracked separately in `docs/research/nomad-node-management.md` because the migration is its own breaking story sequence and is orthogonal to the structural refactor below.
- Workload (`Service`) domain port + Storage real-data wiring for the per-node sections. Stub for now.
- **Replicas as a standalone app** (`@guepard/app-replicas`). For phase 1, replicas remain embedded inside the merged Infrastructure pkg under the Settings sub-view, exactly where they live today — only the surrounding pkg name changes. Replica domain entity, repository, server route, and dedicated app pkg are deferred.
- True topology graph view (Reactflow / SVG nesting). Today's pool-card grid + host-map heatmap stay.

## 2. Motivation

**The audit's six headline findings, distilled.**

1. **Infrastructure redesign is dead code.** `packages/apps/infrastructure/src/plugin-root.tsx` mounts `NodesPluginRoot` from `@guepard/nodes`. The `InfrastructurePluginRoot` from `@guepard/infrastructure` is only consumed by its own Storybook + types-only MSW imports. Tabbed Overview/Clusters/Providers/Activity/Settings ships zero runtime exposure. Two packages, one is dark.
2. **Topology and Infrastructure both compute fleet aggregates** (`use-topology-data.ts` and `use-infrastructure-page.ts`), duplicating logic with divergent shapes. No shared selector. If both were mounted, the same numbers could disagree.
3. **"Pool" is synthesized at the React layer** as `${provider}::${region}::${cluster}`. Brittle: rename a cluster, identity flips. The DB has `node.node_pool` already; domain doesn't model it.
4. **`tid:` is a string protocol.** `nc:`, `np:`, `topology:*` parsed in `apps/web/src/routes/prj/$projectSlug/$routeBase.tsx:27-52`. No type safety, no central registry, easy to drift. Eight `as never` casts in cross-app navigations confirm the smell.
5. **`@guepard/infrastructure` package name collides with semantic intent.** Its only live consumers (`apps/web/src/lib/msw/handlers/replicas.ts`, `apps/web/src/lib/msw/fixtures/infrastructure.ts`) pull *types* from a presentation-layer package. Coupling MSW into the dying UI bundle.
6. **Replicas live inside Infrastructure's Settings tab.** Replicas are placement, not node ops — wrong home. They are also entirely presentation-only (no domain entity, no repo, no DB, no server route).

**Why now.** Phase-1 audit ran on a recently merged feature branch. Adding more surface (Nomad-aligned status enums, real workload modeling, true topology graph) on top of a wiring contradiction will compound the drift. This RFC is the structural reset that unblocks every follow-on phase.

**Upstream dependency.** RFC 0024 (Global Shell UI) defines the project shell + virtual-tab system that this RFC's typed `TabId` plugs into. No conflict; this RFC cleans up the contract that 0024 left implicit.

**Downstream dependents.** The Nomad-status migration (research note already in `docs/research/`) lands as RFC 0026 once 0025 phase 1 is stable. True topology graph view is RFC 0027.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- **G1.** `nc:`, `np:`, `topology:*` strings vanish from emitter and parser sites. Every `navigate({to, search})` for cross-app drill-through round-trips through `encodeTabId` / `decodeTabId` in `@guepard/shell-contracts`.
- **G2.** Zero `as never` casts in any topology / infrastructure / nodes feature package navigate call.
- **G3.** `Pool` exists as a Zod-validated domain entity, with `IPoolRepository`, Supabase adapter (Postgres VIEW), HTTP adapter, server route, and `shell.pools` resource. Topology consumes it; the synthetic `groupIntoPools` helper is deleted.
- **G4.** Replicas continue to function exactly as today (MSW-mocked add/remove flow), accessible via the merged Infrastructure pkg's Settings sub-view. The `Replica` and `ReplicaStatus` types travel with the pkg merge — `@guepard/infrastructure/types` keeps working for MSW imports because the merged pkg re-exports them. No new domain entity, no new app.
- **G5.** `FleetAggregateService` in domain composes `INodeRepository` + `IPoolRepository` and exposes `summary(orgId)`, `pools(orgId)`, `pressurePoints(orgId)`. Topology + the new merged Infrastructure read fleet numbers via `shell.fleet.*` only — no inline `useMemo` aggregation.
- **G6.** Single canonical `@guepard/infrastructure` package. The directory at `packages/features/ops/nodes/` becomes `packages/features/ops/infrastructure/`. Old `@guepard/infrastructure` deleted; clusters/providers tabs removed; settings tab + activity section + replicas section retained as project-level surfaces inside the merged pkg.
- **G7.** Per-node detail page renders Services / Storage / CPU / Memory as **stacked sections**, not tabs. Files renamed `node-detail-{cpu,memory,services,storage}-tab.tsx` → `node-detail-{cpu,memory,services,storage}-section.tsx`. Storage section consumes `node.diskGb` + `node.diskUtilPct` (already present in DB).
- **G8.** `pnpm typecheck && pnpm test` green at every story boundary. No new ESLint disables.

### 3.2 Non-goals (phase 1)

- **Nomad-aligned status enum migration.** Phase 2 (RFC 0026). Reason: orthogonal breaking change with its own three-story sequence. Mixing it into the structural refactor would multiply the blast radius.
- **Workload (`Service`) domain port.** Phase 2. Per-node Services section ships an empty state with a typed stub repository.
- **True topology graph view.** Phase 3 (RFC 0027).
- **Replicas as a standalone app (`@guepard/app-replicas`) + replicas domain entity + real backend.** Phase 2 (RFC 0029). Reason: replicas are presentation-only today (no DB, no server route). Promoting them at the same time as the structural refactor inflates phase 1 without product upside. Phase 1 keeps the existing MSW-mocked `infrastructure-replicas-section.tsx` exactly as-is, only moving with the pkg merge.
- **Pool table (writable metadata).** Phase 2 if/when product confirms pool-level metadata. Phase 1 ships a read-only VIEW.
- **Pressure-point thresholds as configuration.** Phase 1 hardcodes thresholds as domain constants (`HIGH_CPU_PCT = 85`, etc.). Configuration becomes a thing if/when an operator asks.

## 4. Prior art in the codebase

### Reused

- **`packages/shell-contracts`** — already houses `PluginManifest`, `FlatRouteDef`. New `TabId` lives here; matches the package's role as the shell's typed-contract surface.
- **`packages/shell-runtime/src/resources/`** — existing pattern (`notebooks.ts`, `nodes.ts`, etc.). New `pools.ts`, `fleet.ts` mirror the namespace style verbatim.
- **`packages/domain/src/entities/node.type.ts`** — Zod-schema-then-`Entity`-class pattern. New `pool.type.ts` mirrors it.
- **`packages/repositories/supabase/src/*.repository.ts`** — adapter pattern. New `pool.repository.ts` follows it.
- **`apps/server/src/routes/nodes.ts`** — Hono route shape with `zValidator` + `getRepositories(c)`. New `pools.ts` clones it.
- **`apps/web/src/lib/repositories/node.repository.ts`** — HTTP adapter pattern.
- **`packages/features/ops/nodes/src/presentation/components/node-detail-page.tsx`** — already stacks the four section components vertically (line 113-119, comment says "Stacked sections — no sub-tabs"). Phase 1 only renames files + wires Storage to real data.

### Replaced

- **`packages/features/ops/topology/src/application/use-topology-data.ts`** — `groupIntoPools` and `computeAggregate` go away; hook becomes a thin `useQuery` wrapper around `shell.fleet.*` and `shell.pools.list()`.
- **`packages/features/ops/infrastructure/`** (the dying pkg) — clusters/providers/overview tabs deleted; activity + settings + replicas surfaces migrate into the merged pkg as-is.
- **`apps/web/src/routes/prj/$projectSlug/$routeBase.tsx:27-52`** — `deriveTitleFromTid` replaced by `deriveTabTitle(decodeTabId(tid))`.
- **`@guepard/nodes` package name** — folder + name renamed to `@guepard/infrastructure`.

### Orthogonal

- **`packages/apps/integrations`** — untouched. Provider connectivity is not affected by this refactor.
- **`packages/apps/topology`** — manifest stays; only the feature pkg it imports changes shape.
- **Auth / RLS / Supabase wrappers** — RLS on `public.node` is unchanged. The new pool VIEW uses `security_invoker` so RLS flows through.

## 5. Conceptual model

### 5.1 Three apps, one fleet

```
OPS (project bucket)
 ├── Topology       — fleet-wide observability (read-only)
 ├── Infrastructure — per-node operations (CRUD + inspection); contains
 │                    replicas under its Settings sub-view (phase 1)
 └── Integrations   — cloud account connectivity
```

Replicas-as-standalone-app deferred to phase 2 (RFC 0029).

Each app is a thin shell plugin under `packages/apps/<id>/` mounting a feature package under `packages/features/ops/<id>/`. Apps are discovered at build time via `apps/web/src/shell/app-registry.ts`. No app imports another's feature pkg. Cross-app navigation goes through typed `TabId` + path helpers from `@guepard/shell-contracts`.

### 5.2 Vocabulary

- **Node** — a compute machine. Lives in `public.node`. Has identity (`id`, `name`, `nodePool`, `region`, `provider`), capacity (`cpuCores`, `memoryGb`, `diskGb`), and runtime state (`status`, `healthState`, util pcts, heartbeat). Phase 1 keeps the existing four-value `NodeStatus`; the Nomad migration (RFC 0026) extends it.
- **Pool** — a placement boundary. Synthetic in phase 1 (a Postgres VIEW over `node.node_pool`). Real entity in domain so the topology UI stops faking IDs. Phase 2 may add a writable `public.pool` table.
- **FleetSummary** — aggregate readout: total node count, status counts, region/cluster/provider counts, average util. Computed in domain (`FleetAggregateService.summary`), cached at the runtime layer.
- **PressurePoint** — `{ kind: 'high-cpu' | 'high-mem' | 'down', nodeId, nodeName, value }`. The "where do I look first" affordance for topology.
- **Replica** — a placement instance, not a node. Has region, provider, computeTier, status. Phase 1 keeps replicas as a presentation-only type inside the merged Infrastructure pkg (no domain entity yet). Phase 2 (RFC 0029) promotes them.
- **TabId** — a discriminated union encoded into the `tid` URL search param. Replaces every `topology:*` / `nc:*` / `np:*` / `node:*` string convention.

### 5.3 Data flow

```
SQL (public.node, public.pool_view)
   ↓ Supabase adapter
INodeRepository, IPoolRepository (domain ports)
   ↓ Domain services (FleetAggregateService, ListPoolsByProjectService, ...)
   ↓ Shell-runtime resources (shell.nodes, shell.pools, shell.fleet)
   ↓ React hooks in feature packages (useTopologyData, useInfrastructurePage, ...)
   ↓ Presentation components
```

Strict per `.claude/rules/hexagonal-architecture.md`. Domain has zero React / fetch / Supabase imports. Adapters implement ports. Apps consume `useShell()`.

### 5.4 TabId protocol

`TabId` lives in `packages/shell-contracts/src/tab-id.ts` as a Zod-discriminated union with six variants:

```ts
type TabId =
  | { kind: 'node-cluster'; cluster: string | null }
  | { kind: 'node-provider'; provider: NodeProvider }
  | { kind: 'node-name'; name: string }
  | { kind: 'topology-pool'; provider: NodeProvider | 'unknown'; region: string; cluster: string | null }
  | { kind: 'topology-node'; nodeId: string }
  | { kind: 'topology-attention' };
```

`encodeTabId(tab)` produces a colon-delimited token (`topology-pool:aws:us-east-1:default`). Backwards-compat: `decodeTabId(raw)` accepts both legacy forms (`topology:aws:us-east-1:default`, `nc:default`, `np:aws`) and the canonical kind-prefixed form during the deprecation window. Legacy parsing is deleted in phase 2 once analytics confirm no live URLs in the wild.

`deriveTabTitle(tab, { providers, t })` takes a `t` translator from `react-i18next` and a `providers` label map, returning the localized title string. Replaces the inline `PROVIDER_LABELS` const + branch logic in `apps/web/src/routes/prj/$projectSlug/$routeBase.tsx`.

## 6. Architecture overview

### 6.1 New packages

None. Phase 1 is structural cleanup; no new feature or app packages ship.

### 6.2 Renamed packages

| Old name                                  | Old path                              | New name                  | New path                              |
| ----------------------------------------- | ------------------------------------- | ------------------------- | ------------------------------------- |
| `@guepard/nodes`                          | `packages/features/ops/nodes/`        | `@guepard/infrastructure` | `packages/features/ops/infrastructure/` |
| `@guepard/infrastructure` (the dying one) | `packages/features/ops/infrastructure/` | (deleted before rename)   | (deleted)                             |

### 6.3 New domain artifacts

- `packages/domain/src/entities/pool.type.ts` — `PoolSchema`, `PoolEntity`.
- `packages/domain/src/repositories/pool-repository.port.ts` — `IPoolRepository`.
- `packages/domain/src/services/pool/list-pools-by-project.usecase.ts`.
- `packages/domain/src/services/fleet/fleet-aggregate.usecase.ts` — `FleetAggregateService` with `summary | pools | pressurePoints`.
- `packages/domain/src/usecases/fleet/{fleet-summary.dto.ts,pressure-point.dto.ts}`.

### 6.4 New runtime resources

- `packages/shell-runtime/src/resources/pools.ts` — `shell.pools.list`, `keys.listByProject`, `invalidate.list`.
- `packages/shell-runtime/src/resources/fleet.ts` — `shell.fleet.{summary,pools,pressurePoints,invalidate}`.

### 6.5 New shell contracts

- `packages/shell-contracts/src/tab-id.ts` — `TabIdSchema`, `encodeTabId`, `decodeTabId`, `deriveTabTitle`. Adds `zod` as a runtime dep on `shell-contracts`.

### 6.6 New SQL

- `apps/web/supabase/schemas/46-platform-pools.sql` — `pool_view` over `public.node` aggregating per `(node_pool, hosting_provider, region)`. `security_invoker = true` so RLS on `public.node` flows through. No new table.

### 6.7 Deletions

- `packages/features/ops/infrastructure/src/presentation/components/cluster-card.tsx`
- `packages/features/ops/infrastructure/src/presentation/components/cluster-details-sheet.tsx`
- `packages/features/ops/infrastructure/src/presentation/components/infrastructure-clusters-tab.tsx`
- `packages/features/ops/infrastructure/src/presentation/components/infrastructure-providers-tab.tsx`
- `packages/features/ops/infrastructure/src/presentation/components/infrastructure-overview-tab.tsx`
- `packages/features/ops/infrastructure/src/application/derive-cluster-rows.ts`
- `packages/features/ops/infrastructure/src/application/derive-provider-rows.ts`
- `packages/features/ops/infrastructure/src/application/derive-region-rows.ts`
- `packages/features/ops/infrastructure/src/application/use-infrastructure-data.ts`
- `packages/features/ops/infrastructure/src/application/use-infrastructure-page.ts`
- `packages/features/ops/infrastructure/src/application/types.ts` — split during the merge: `Replica`, `ReplicaStatus`, `InfrastructureSettings`, `InfrastructureActivity`, `ActivityDataPoint` are kept and migrate into the merged pkg's `application/types.ts`. Cluster/provider/region view-models are deleted.
- `packages/features/ops/topology/src/application/use-topology-data.ts:groupIntoPools` (function-level deletion)
- `packages/features/ops/topology/src/application/use-topology-data.ts:computeAggregate` (function-level deletion)
- `apps/web/src/lib/i18n/locales/en/nodes.json` — merged into `infrastructure.json` under `node.*`

## 7. Phasing

### 7.1 Story sequence

```
Phase 1
  S01  TabId protocol            — independent
  S03  Pool entity + VIEW        — independent (parallel with S01)
  S04  shell.fleet runtime       — depends on S03 phase A (Pool DTOs)
  S05  Pkg rename + merge        — depends on S01, S04 merged
  S06  Per-node sections rename  — depends on S05 (same files)
```

S02 (replicas extraction into a standalone app) is deferred to phase 2 and does not appear in phase 1. Numbering preserves the audit ordering for traceability.

S01 and S03 launch in parallel. Each lands its own story branch and merges to `main` independently. S04 starts when S03 phase A (domain types only) is on `main`. S05 + S06 are sequential (same package).

### 7.2 Story-to-task allocation

Each story stays under the spec-driven-dev cap of 1–8 tasks. Bugfix carve-outs reserved per `.claude/rules/spec-driven-dev.md`.

### 7.3 Phases beyond 1

| Phase | Capability                                                                          | Ships in              | Status |
| ----- | ----------------------------------------------------------------------------------- | --------------------- | ------ |
| 1     | Typed TabId, Pool entity, shell.fleet, pkg rename, node-detail sections             | This RFC + spec       | Draft  |
| 2     | Nomad-aligned NodeStatus, eligibility, structured drain, lastHeartbeatAt             | RFC 0026              | Future |
| 3     | True topology graph view (Reactflow / SVG nesting)                                  | RFC 0027              | Future |
| 4     | Workload (Service) domain port, Storage real backend                                | RFC 0028              | Future |
| 5     | Replicas standalone app + domain entity + real Supabase backend + RLS               | RFC 0029              | Future |

## 8. Open questions

All resolved at RFC time with recommended defaults baked into the spec. The spec's §1 Resolved Open Questions table mirrors this section.

1. **TabId encoding format.** Colon-delimited (`kind:payload`) vs base64-JSON. Resolution: **colon-delimited.** Backwards-compatible with existing bookmarks; one URL param.
2. **Pool DB strategy.** New `public.pool` table vs read-only VIEW over `public.node`. Resolution: **VIEW only (phase 1).** No metadata in flight; `IPoolRepository` shape supports a later swap to a backed table.
3. **Cluster / provider / region row VMs.** Stay in feature pkg vs move to `FleetAggregateService`. Resolution: **stay in feature pkg.** They join integration metadata to provider rollups — UI-shaped joins. Domain stays clean.
4. **Survival of `ClusterViewModel` / `ProviderViewModel` / `RegionViewModel`.** Resolution: **delete.** No consumer in the merged pkg; topology covers the equivalent surface via Pool entity.
5. **Folder rename strategy.** Keep `nodes/` folder + rename only `package.json:name` vs rename folder. Resolution: **rename folder.** Folder name should track package name.
6. **Settings page scope.** Per-project (compute tier defaults) vs per-node section. Resolution: **per-project.** Existing fields (computeTier, diskGb, diskType, iops, throughput) are project-level defaults.
7. **Component-name renames.** `NodesPluginRoot` → `InfrastructurePluginRoot`? Resolution: **yes.** User-facing surface is "Infrastructure"; codebase shouldn't carry two nouns.
8. **i18n merge style.** Flat keys vs `node.*` subprefix. Resolution: **`node.*` subprefix.** Avoids collision with existing `infrastructure.tabs.*` etc.
9. **Workload domain port (Services section).** Resolution: **stub for phase 1.** Section ships empty state. Phase 4 wires real workloads.
10. **Replicas relocation scope (phase 1 vs phase 2).** Resolution: **defer to phase 2.** Phase 1 keeps replicas embedded in the merged Infrastructure pkg under the Settings sub-view. Replica domain entity, dedicated app, and real backend ship together in RFC 0029.

## 9. Alternatives considered

- **Delete the dying `@guepard/infrastructure` outright and forget the merge.** Rejected — the activity section + settings tab are real per-project surfaces that the current nodes-list page doesn't cover. Losing them would regress functionality.
- **Keep `@guepard/nodes` as the canonical name.** Rejected — the user-facing nav says "Infrastructure"; the package name should match. Rename cost is one-shot.
- **Promote Pool to a writable table now.** Deferred — no metadata is product-confirmed for phase 1. VIEW unblocks the typed entity + ports without dragging migration risk in.
- **Compute fleet aggregates in a Postgres function rather than `FleetAggregateService`.** Deferred to phase 2 if performance demands. Phase 1 keeps the logic in the domain layer where it's portable and testable.
- **Keep the `tid:` string protocol.** Rejected — eight `as never` casts in the audit's contract inventory confirm the smell. Typed `TabId` pays for itself the moment a seventh variant is added.
- **Promote `Replica` to a domain entity in phase 1 even without a standalone app.** Rejected — premature without a real backend; would force MSW shape changes for zero product value. Bundled with the standalone-app work in RFC 0029.

## 10. References

### Internal

- `.claude/rules/hexagonal-architecture.md`
- `.claude/rules/architecture.md`
- `.claude/rules/spec-driven-dev.md`
- `.claude/rules/i18n.md`
- `.claude/rules/database.md`
- `.claude/rules/clean-code.md`
- `.claude/rules/conventions.md`
- `.claude/rules/design-system.md`
- `docs/research/nomad-node-management.md`
- `docs/rfcs/0024-global-shell-ui.md`
- `apps/web/supabase/schemas/43-platform-nodes-v2.sql`
- `apps/web/supabase/schemas/NODES.md`

### External

- HashiCorp Nomad public docs (cited in `docs/research/nomad-node-management.md`).

---

## Review checklist for the author

- [x] Does §1 make the scope obvious in one paragraph? — Yes; six refactors enumerated, phase-1 vs deferred split.
- [x] Is every §3.1 goal an observable exit criterion? — Yes; G1–G8 each checkable with `grep` / `pnpm` / route test.
- [x] Is every §3.2 non-goal pinned to a named future phase? — Yes; phases 2–5 mapped.
- [x] Does §4 distinguish reused prior art from replaced prior art? — Yes; three subsections.
- [x] Would a newcomer understand the concept after reading only §1 through §5? — §5 establishes vocabulary, three apps, data flow, TabId protocol.
- [x] Are the open questions real decisions, or are any of them placeholders? — All real; pre-resolved with recommended defaults.
- [x] Does the rollout plan match realistic engineering capacity for the next quarters? — Six stories, parallelizable, each ≤8 tasks.
- [x] Does every alternative in §9 have a concrete reason it was not chosen? — Yes.
