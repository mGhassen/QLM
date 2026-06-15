# Spec — OPS compute refactor (phase 1)

| Field        | Value                                                       |
| ------------ | ----------------------------------------------------------- |
| Status       | Draft                                                       |
| Author       | Mohamed Aziz Ktata                                          |
| Created      | 2026-04-27                                                  |
| Implements   | [RFC 0025 — OPS compute refactor](../rfcs/0025-ops-compute-refactor.md) |
| Target phase | Phase 1                                                     |

This spec defines what phase 1 ships and how. RFC 0025 defines why and what shape.

---

## 1. Resolved open questions

| #  | Question                                                                    | Resolution for phase 1                                                                                                  |
| -- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1  | TabId encoding format                                                       | Colon-delimited `kind:payload` token. Backwards-compatible with existing bookmarks.                                     |
| 2  | Pool DB strategy                                                            | Read-only Postgres VIEW `public.pool_view` over `public.node`. No new table.                                            |
| 3  | Cluster / provider / region row VMs                                         | Stay in feature pkg as UI-shaped joins. Phase 1 deletes them entirely; phase 2 reintroduces only if a real consumer surfaces. |
| 4  | Survival of `ClusterViewModel` / `ProviderViewModel` / `RegionViewModel`    | Delete.                                                                                                                 |
| 5  | Folder rename strategy                                                      | Rename folder. `git mv` to preserve history.                                                                            |
| 6  | Settings page scope                                                         | Project-level. Lives at `/prj/$slug/infrastructure?view=settings`.                                                      |
| 7  | Component-name renames                                                      | `NodesPluginRoot` → `InfrastructurePluginRoot`, `NodesListPage` → `InfrastructureListPage`, etc.                        |
| 8  | i18n merge style                                                            | Single `infrastructure.json` namespace; moved keys take `node.*` subprefix.                                             |
| 9  | Workload (Services section) domain port                                     | Stub for phase 1. Section ships empty state.                                                                            |
| 10 | TabId backwards-compat window                                               | `decodeTabId` accepts both legacy (`nc:`, `np:`, `topology:*`) and canonical (`kind:payload`) forms during phase 1. Legacy parsing deleted in phase 2. |
| 11 | Pressure-point thresholds                                                   | Hardcoded constants in domain: `HIGH_CPU_PCT = 85`, `HIGH_MEM_PCT = 85`. No configuration surface in phase 1.            |
| 12 | Replicas relocation scope                                                   | Phase 1 keeps replicas embedded in the merged Infrastructure pkg under the Settings sub-view (today's `infrastructure-replicas-section.tsx` migrates with the pkg merge). Standalone app + domain entity + real backend deferred to RFC 0029. |

## 2. User stories

- As a platform engineer, I can drill from Topology into a pool detail sheet and the URL stays stable + bookmarkable, regardless of pool rename.
- As a platform engineer, I see identical fleet numbers (total nodes, status counts, regions) on both Topology and Infrastructure pages because they read from the same `shell.fleet.summary()` query.
- As a developer, I can add a new cross-app virtual tab by extending one Zod-validated `TabIdSchema` union — no string-prefix branching anywhere.
- As a developer, I can `import { Pool } from '@qlm/domain/entities'` and treat it the same as `Node`.
- As a platform engineer opening a node detail page, I see Services / Storage / CPU / Memory as scrollable sections, with Storage showing real disk numbers from `node.diskGb` / `node.diskUtilPct`.
- As a platform engineer, I keep my existing replicas workflow (Settings sub-view of Infrastructure) — phase 1 changes nothing for the replicas user.

## 3. Functional flow

### 3.1 Information architecture

```
/prj/$slug/topology           — Topology app (read-only fleet view)
/prj/$slug/infrastructure     — Infrastructure app (per-node CRUD + inspection)
/prj/$slug/infrastructure?view=activity  — activity sub-view (project-wide)
/prj/$slug/infrastructure?view=settings  — settings sub-view (project-wide; contains replicas)
/prj/$slug/integrations       — Integrations app (unchanged)
/node/$nodeId                 — Flat per-node URL (unchanged; still mounted by infrastructure app)
```

Sidebar bucket order under OPS: Topology (15) → Infrastructure (20) → Integrations (30). Replicas live inside Infrastructure → Settings; standalone app deferred to RFC 0029.

### 3.2 Screen-by-screen

#### Topology page

Unchanged composition, refactored data source. `useTopologyData(projectId)` now wraps two queries:
- `shell.fleet.summary(projectId)` → `FleetSummary`
- `shell.fleet.pools(projectId)` → `Pool[]` (delegates to `shell.pools.list()`)
- `shell.fleet.pressurePoints(projectId)` → `PressurePoint[]` (rendered above the attention CTA in `TopologyFleetSummary`)

Pool drill-through emits `encodeTabId({ kind: 'topology-pool', provider, region, cluster })`.

#### Infrastructure page

Renamed from "nodes-list-page" to "infrastructure-list-page" inside the merged pkg. URL `view` query param controls sub-view:
- `view` absent or `state` → today's nodes list (default)
- `view=activity` → mounts `InfrastructureActivitySection` (migrated from dying pkg)
- `view=settings` → mounts `InfrastructureSettingsTab` (migrated from dying pkg)

Tab bar at the top of the page uses `Tabs` from `@qlm/ui/tabs`, mirroring the dying pkg's existing pattern (`infrastructure-list-page.tsx:76-149`).

The Settings sub-view embeds the existing `infrastructure-replicas-section.tsx` and `infrastructure-settings-tab.tsx` side-by-side, identical to today's UX.

#### Per-node detail page

`NodeDetailPage` (in merged pkg). Stacked sections:

1. `NodeDetailCpuSection` — already wired.
2. `NodeDetailMemorySection` — already wired.
3. `NodeDetailServicesSection` — empty state (workload port stubbed).
4. `NodeDetailStorageSection` — wired in this phase to `node.diskGb` + `node.diskUtilPct`.

### 3.3 User flows (happy paths)

#### Cross-app drill from Topology pool → Infrastructure filtered

1. User clicks a pool card on `/topology`.
2. Pool sheet opens.
3. User clicks "Drill into" CTA.
4. `encodeTabId({ kind: 'topology-pool', provider, region, cluster })` produces `topology-pool:aws:us-east-1:default`.
5. Navigate to `/infrastructure?tid=topology-pool:aws:us-east-1:default&provider=aws&region=us-east-1&cluster=default`.
6. Route host validates `tid` via `decodeTabId`; produces a `VirtualTab` with localized title `"AWS · us-east-1 · default"`.
7. Infrastructure list applies the search params as filters.

### 3.4 Error and edge-case behaviour

- Missing `tid` query param → no virtual tab; default route base used as activeTabId. Existing behaviour.
- Malformed `tid` (decode fails) → `decodeTabId` returns `null`. Route renders without a virtual tab. Console warning in dev. No throw.
- Legacy `tid` (`nc:default`, `topology:aws:us-east-1:default`) → `decodeTabId` accepts and maps to canonical variant. Title derivation works.
- `shell.fleet.summary` errors → topology page shows `EntityErrorBanner` with retry. Infrastructure page does the same; both share the `FleetSummary` cache key so a single retry recovers both surfaces.
- Pool with zero nodes → not returned by the VIEW. Topology never sees empty pools.
- Replicas section (inside Infrastructure → Settings) keeps its existing optimistic add/remove flow unchanged.

## 4. Technical flow

### 4.1 Layered sequence — fleet summary

```
TopologyPage (presentation)
  → useTopologyData (feature/topology hook)
    → shell.fleet.summary({ projectId })  (shell-runtime)
      → new FleetAggregateService(nodeRepo, poolRepo).summary(orgId)  (domain)
        → INodeRepository.findByProjectId  +  IPoolRepository.findByProjectId
          → adapters (Supabase or HTTP)
            → SQL (public.node, public.pool_view)
```

### 4.2 Layered sequence — pool drill-through

```
TopologyPage onClick(pool)
  → encodeTabId({ kind: 'topology-pool', ... })  (shell-contracts)
  → navigate({ to: '/prj/$slug/infrastructure', search: { tid, provider, region, cluster } })
  → $routeBase.tsx validateSearch
    → decodeTabId(search.tid)  (shell-contracts)
    → deriveTabTitle(tabId, { providers, t })  (shell-contracts + i18n)
    → ProjectShellHost activeTabId={search.tid ?? routeBase}
```

### 4.3 Component split

- `packages/features/ops/topology/` — pure presentation + hooks. Imports `Pool`, `FleetSummary`, `PressurePoint` from `@qlm/domain/entities` (or `@qlm/domain/usecases/fleet`). No HTTP, no Supabase.
- `packages/features/ops/infrastructure/` (renamed from nodes/) — pure presentation + hooks. Imports `Node`, plus `FleetSummary` for any shared aggregate UI. Hosts the migrated replicas section + settings tab + activity section under its Settings / Activity sub-views.
- `packages/apps/{topology,infrastructure}/` — thin shell glue. Manifest + plugin-root re-export. No business logic.

## 5. API contracts

### 5.1 Data shapes

```ts
// packages/domain/src/entities/pool.type.ts
export const PoolSchema = z.object({
  id: z.string(),                                  // synthetic: ${provider}::${region}::${nodePool||'_'}
  projectId: z.string(),
  name: z.string(),                                // node_pool value or '__unclustered__'
  provider: z.union([z.enum(NODE_PROVIDERS), z.literal('unknown')]),
  region: z.enum(NODE_REGIONS),
  nodeCount: z.number().int().nonnegative(),
  totalCpu: z.number().int().nonnegative(),
  totalMemoryGb: z.number().nonnegative(),
  statusCounts: z.record(z.enum(NODE_STATUSES), z.number().int().nonnegative()),
  avgCpuUtilPct: z.number().min(0).max(100).optional(),
  avgMemUtilPct: z.number().min(0).max(100).optional(),
});
export type Pool = z.infer<typeof PoolSchema>;

// packages/domain/src/usecases/fleet/fleet-summary.dto.ts
export type FleetSummary = {
  total: number;
  totalCpu: number;
  totalMem: number;
  avgCpuUtil?: number;
  avgMemUtil?: number;
  statusCounts: Record<NodeStatus, number>;
  regions: number;
  clusters: number;
  providers: number;
};

// packages/domain/src/usecases/fleet/pressure-point.dto.ts
export type PressurePoint = {
  kind: 'high-cpu' | 'high-mem' | 'down';
  nodeId: string;
  nodeName: string;
  value: number;       // 0-100 for util kinds; 1 for 'down'
};

// packages/shell-contracts/src/tab-id.ts
export const TabIdSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('node-cluster'), cluster: z.string().nullable() }),
  z.object({ kind: z.literal('node-provider'), provider: z.enum(NODE_PROVIDERS) }),
  z.object({ kind: z.literal('node-name'), name: z.string() }),
  z.object({
    kind: z.literal('topology-pool'),
    provider: z.union([z.enum(NODE_PROVIDERS), z.literal('unknown')]),
    region: z.string(),
    cluster: z.string().nullable(),
  }),
  z.object({ kind: z.literal('topology-node'), nodeId: z.string() }),
  z.object({ kind: z.literal('topology-attention') }),
]);
export type TabId = z.infer<typeof TabIdSchema>;

export function encodeTabId(tab: TabId): string;
export function decodeTabId(raw: string): TabId | null;  // accepts canonical + legacy forms
export function deriveTabTitle(tab: TabId, ctx: { t: TFunction; providers?: Record<string, string> }): string;
```

### 5.2 Endpoints

| Method | Path                          | Auth    | Body | Response             | Status            |
| ------ | ----------------------------- | ------- | ---- | -------------------- | ----------------- |
| GET    | `/api/pools?projectId=<id>`   | session | —    | `{ items: Pool[] }`  | 200, 401, 403, 500 |

Phase 1 ships pools as a real Supabase-backed read. Replicas continue to use the existing MSW-only `/api/replicas` mock handler unchanged — no server route or domain entity ships in phase 1.

### 5.3 Rate limiting, pagination, caching

- Pools: read-only, full list per project. No pagination (project-scoped — bounded). React Query `staleTime: 30s` matching the existing nodes resource.
- Fleet summary: computed every request (no Postgres-side memoization in phase 1). React Query caches at `staleTime: 30s`.
- Replicas: unchanged from today (MSW-mocked, in-memory).

## 6. Data model

### 6.1 Schema

New file: `apps/web/supabase/schemas/46-platform-pools.sql`.

```sql
-- Read-only aggregation view; no new table.
-- security_invoker = true so RLS on public.node flows through.
CREATE OR REPLACE VIEW public.pool_view
WITH (security_invoker = true) AS
SELECT
  COALESCE(node_pool, '__unclustered__') || '::' || COALESCE(hosting_provider::text, 'unknown') || '::' || COALESCE(region, 'unknown') AS id,
  organization_id,
  COALESCE(node_pool, '__unclustered__')                         AS name,
  COALESCE(hosting_provider::text, 'unknown')                    AS provider,
  COALESCE(region, 'unknown')                                    AS region,
  COUNT(*)                                                       AS node_count,
  SUM(cpu)                                                       AS total_cpu,
  SUM(disk_gb)                                                   AS total_disk_gb,
  SUM(memory_gb)                                                 AS total_memory_gb
FROM public.node
WHERE organization_id IS NOT NULL
GROUP BY organization_id, node_pool, hosting_provider, region;

COMMENT ON VIEW public.pool_view IS
  'Read-only pool aggregation. RLS inherits from public.node via security_invoker.';

CREATE INDEX IF NOT EXISTS idx_node_pool_grouping
  ON public.node (organization_id, node_pool, hosting_provider, region)
  WHERE organization_id IS NOT NULL;
```

After landing the schema file: `pnpm supabase:web:reset && pnpm supabase:web:typegen`.

### 6.2 Config / payload contracts

None new. `Replica.computeTier` continues to use the string ID convention from `compute-tiers.ts` (e.g. `'micro'`, `'small'`).

### 6.3 Secrets contract

No new secrets. Pool VIEW is read-only and inherits RLS. Replicas mock data is in-memory MSW only — never serialized to a real backend in phase 1.

## 7. File-by-file work items

### 7.1 Domain (`packages/domain`)

- **Add** `src/entities/pool.type.ts` — `PoolSchema`, `Pool`, `PoolEntity`.
- **Add** `src/repositories/pool-repository.port.ts` — `IPoolRepository` abstract (`findByProjectId`).
- **Add** `src/services/pool/list-pools-by-project.usecase.ts`.
- **Add** `src/services/fleet/fleet-aggregate.usecase.ts` — `FleetAggregateService` with `summary | pools | pressurePoints`.
- **Add** `src/usecases/fleet/{fleet-summary.dto.ts,pressure-point.dto.ts,index.ts}`.
- **Edit** `src/{entities,repositories,services,usecases}/index.ts` — barrel exports.
- **Edit** `src/repositories/repositories.ts` — add `pool: IPoolRepository`.

### 7.2 Adapters (`packages/repositories/*` and `apps/web/src/lib/repositories`)

- **Add** `packages/repositories/supabase/src/pool.repository.ts` — `SELECT * FROM public.pool_view WHERE organization_id = ...`. Returns `Pool[]`.
- **Add** `apps/web/src/lib/repositories/pool.repository.ts` — HTTP adapter for `GET /api/pools`.
- **Edit** `apps/web/src/lib/repositories-factory.ts` — wire `pool` into `Repositories`.

### 7.3 Shell runtime (`packages/shell-runtime`)

- **Add** `src/resources/pools.ts` — `shell.pools.list`, `keys.listByProject`, `invalidate.list`.
- **Add** `src/resources/fleet.ts` — `shell.fleet.{summary,pools,pressurePoints,invalidate}`. Internally instantiates `new FleetAggregateService(nodeRepo, poolRepo)`.
- **Edit** `src/client.ts` — register `shell.pools`, `shell.fleet`.

### 7.4 Server (`apps/server`)

- **Add** `src/routes/pools.ts` — Hono route with `zValidator('query', { projectId })`. Resolves project → org → calls `new ListPoolsByProjectService(repos.pool).execute(...)`.
- **Edit** `src/server.ts` — register pool route module.

### 7.5 Presentation — feature packages

#### S05 — pkg rename + merge

- **Rename folder** `packages/features/ops/nodes/` → `packages/features/ops/infrastructure/` via `git mv`.
- **Edit** `packages/features/ops/infrastructure/package.json` — `name: '@qlm/infrastructure'`. Add `exports['./types']: './src/application/types.ts'` (preserves MSW import path until S02 migrates fixtures).
- **Edit** `packages/features/ops/infrastructure/src/index.ts` — rename `NodesPluginRoot` → `InfrastructurePluginRoot`, etc.
- **Migrate from dying pkg** — move:
  - `infrastructure-activity-section.tsx` → `packages/features/ops/infrastructure/src/presentation/components/`
  - `infrastructure-settings-tab.tsx` → same
  - `infrastructure-replicas-section.tsx` → same
  - `application/use-activity-data.ts`, `application/use-infrastructure-settings.ts`, `application/use-replicas.ts`, `application/compute-tiers.ts` → `packages/features/ops/infrastructure/src/application/`
  - Carve `Replica`, `ReplicaStatus`, `InfrastructureSettings`, `InfrastructureActivity`, `ActivityDataPoint` out of the dying `application/types.ts` into the merged pkg's `application/types.ts`. Delete cluster/provider/region view-models in the same diff.
- **Add** `infrastructure-page.tsx` — new wrapper that switches between nodes-list / activity / settings based on `view` query param. Settings sub-view stacks `InfrastructureSettingsTab` + `InfrastructureReplicasSection` (today's pattern).
- **Preserve subpath export** — keep `exports['./types']: './src/application/types.ts'` on the merged pkg so MSW handlers (`apps/web/src/lib/msw/handlers/replicas.ts`) keep their `import type { Replica } from '@qlm/infrastructure/types'` line working without changes.
- **Delete** dying pkg files listed in RFC §6.7.

#### S06 — per-node sections rename

- **Rename** `node-detail-{cpu,memory,services,storage}-tab.tsx` → `…-section.tsx`.
- **Edit** `node-detail-page.tsx` — update imports.
- **Edit** `node-detail-storage-section.tsx` — replace empty state with `ResourceCard` consuming `node.diskGb` + `node.diskUtilPct`.
- **Edit** `packages/domain/src/entities/node.type.ts` — add optional `diskGb?: number`, `diskUtilPct?: number`.
- **Edit** `packages/repositories/supabase/src/node.repository.ts` — read `disk_gb` + join `node_runtime_state.disk_util_pct`.

#### Topology pkg (`packages/features/ops/topology`)

- **Edit** `src/application/use-topology-data.ts` — collapse `groupIntoPools`/`computeAggregate` deletion. Replace with `useQuery` calls against `shell.fleet.summary`, `shell.fleet.pools`, `shell.fleet.pressurePoints`.
- **Edit** `src/presentation/plugin-root.tsx` — replace inline `topology:*` strings with `encodeTabId({ kind: 'topology-pool', ... })`. Same for attention CTA + node drill.
- **Edit** `src/presentation/components/topology-pool-card.tsx`, `topology-pool-sheet.tsx`, `topology-host-map.tsx`, `topology-fleet-summary.tsx` — props switch from `TopologyPool` / `TopologyAggregate` to `Pool` / `FleetSummary`.
- **Add** `src/presentation/components/topology-pressure-list.tsx` — renders `PressurePoint[]` above the attention CTA.
- **Add** `src/application/constants.ts` — central status palette (`STATUS_DOT`, `STATUS_TILE`, `STATUS_FILL`) replacing the four duplicated maps.

### 7.6 Shell apps (`packages/apps/<name>`)

- **Edit** `packages/apps/infrastructure/src/plugin-root.tsx` — `import from '@qlm/infrastructure'` (was `@qlm/nodes`); rename symbols.
- **Edit** `packages/apps/infrastructure/package.json` — dependency `@qlm/nodes` → `@qlm/infrastructure`.
- **Edit** `apps/web/package.json` — replace `@qlm/nodes` workspace dep with `@qlm/infrastructure`. The existing `@qlm/infrastructure` workspace dep already pointed at the dying pkg; after the rename it resolves to the merged pkg. Confirm version pin.

### 7.7 i18n

- **Edit** `apps/web/src/lib/i18n/locales/en/infrastructure.json` — merge `nodes.json` keys under `node.*` subprefix; keep `replicas.*`, `settings.*`, `activity.*`, `tabs.*`; delete `clusters.*`, `providers.*`, `overview.*`.
- **Delete** `apps/web/src/lib/i18n/locales/en/nodes.json`.
- **Edit** `apps/web/src/lib/i18n/locales/en/topology.json` — add `pressure.{highCpu,highMem,down}` keys.
- **Edit** `apps/web/src/lib/i18n/locales/en/shell.json` — add `tab.provider.{aws,gcp,azure,on-premise}`, `tab.attention`, `tab.unclustered`.
- **Edit** `apps/web/src/lib/i18n/i18n.settings.ts` — remove `'nodes'` from `defaultI18nNamespaces`. `'infrastructure'` is already present.

### 7.8 Shell contracts (`packages/shell-contracts`)

- **Add** `src/tab-id.ts` — schema, encode/decode, deriveTitle.
- **Add** `src/tab-id.test.ts` — round-trip tests for every variant + every legacy form.
- **Edit** `src/index.ts` — re-export.
- **Edit** `package.json` — add `zod` dep (currently dep-free).

## 8. Permissions and RLS

- **`pool_view`** — `security_invoker = true`. Inherits RLS from `public.node`. No new policies.
- **No new tables.** No new RLS policies needed in phase 1.
- **Replicas** — no DB persistence in phase 1 (MSW-only). RFC 0029 adds policies when the real backend lands.

## 9. Security checklist

- [x] **No new secrets.** Pool VIEW reads existing data; replicas remain MSW-only.
- [x] **RLS preserved.** `pool_view` is `security_invoker`; inherits node RLS.
- [x] **Audit log.** No new security-relevant actions in phase 1.
- [x] **Input validation.** Every new server route uses `zValidator`. `TabId` decode is Zod-validated.
- [x] **No PII added.** Pool aggregates anonymous capacity.
- [x] **No new auth surface.** Existing session cookie auth applies.
- [x] **Generic error messages.** Server routes return `{ error: 'unauthorized' }` (no info leakage).

## 10. Verification plan

### 10.1 Static checks

`pnpm typecheck && pnpm lint && pnpm format` green at every story boundary.

### 10.2 Unit tests

- `packages/domain/__tests__/services/pool/list-pools-by-project.test.ts` — happy path + empty project.
- `packages/domain/__tests__/services/fleet/fleet-aggregate.test.ts` — summary numbers, pressure-point thresholds, pool delegation.
- `packages/shell-contracts/src/tab-id.test.ts` — encode/decode round-trip for every variant; legacy form acceptance; malformed input → null.

### 10.3 Integration tests

- `apps/server/__tests__/pools.test.ts` — Hono `app.request` on `/api/pools`; happy path + 401 + project-not-found.

### 10.4 End-to-end (Playwright)

- `apps/web/e2e/topology-drill.spec.ts` — click a pool card → drill into infrastructure → verify URL contains `tid=topology-pool:...` and the virtual tab title is localized.
- `apps/web/e2e/infrastructure-settings-replicas.spec.ts` — navigate to `/infrastructure?view=settings`, verify the existing replicas section renders unchanged after the pkg merge.

### 10.5 Manual smoke

1. `pnpm dev`.
2. Open `/prj/$slug/topology`. Confirm fleet summary numbers match `/prj/$slug/infrastructure` (both read same `shell.fleet.summary`).
3. Click a pool card → "Drill into" → URL stays bookmarkable.
4. Open `/prj/$slug/infrastructure?view=settings`. Verify replicas section + settings tab both render. Add and remove a replica to confirm the migrated section still works.
5. Open a node detail page. Confirm Services / Storage / CPU / Memory all render as stacked sections, Storage shows real disk numbers.
6. `pnpm --filter @qlm/infrastructure storybook`. Verify renamed sections render correctly.

## 11. i18n key map

### `infrastructure.json` (after S05 merge)

- `infrastructure.tabs.{state,activity,settings}` — kept.
- `infrastructure.activity.*` — kept.
- `infrastructure.settings.*` — kept.
- `infrastructure.replicas.*` — kept (replicas stay embedded in Settings sub-view).
- `infrastructure.node.col.{name,region,provider,cluster,cpu,memory,status,health}` — moved from `nodes.json`.
- `infrastructure.node.detail.cpu.*`, `…detail.memory.*`, `…detail.services.*`, `…detail.storage.*` — moved + new for storage real-data.

### `topology.json` (additions only)

- `topology.pressure.{highCpu,highMem,down}` — pressure-point labels.

### `shell.json` (additions only)

- `shell.tab.provider.{aws,gcp,azure,on-premise}`.
- `shell.tab.attention`.
- `shell.tab.unclustered`.

## 12. Implementation sequencing

```
S01  TabId protocol            — independent, parallelizable
S03  Pool entity + VIEW        — independent, parallelizable (numbering preserves audit traceability; S02 deferred)
S04  shell.fleet runtime       — depends on S03 phase A merged
S05  Pkg rename + merge        — depends on S01, S04 merged
S06  Per-node sections rename  — depends on S05 merged (same files)
```

Stage A — types and UI scaffolding: **S01** (TabId schema + tests).

Stage B — data and domain: **S03 phase A** (Pool entity + ports + VIEW SQL), **S04 phase A** (Fleet service + DTOs).

Stage C — server: **S03 phase B** (pools route).

Stage D — web wiring: **S01 phase B** (call sites), **S03 phase C–E** (HTTP adapter + runtime + topology consumes), **S04 phase B–C** (runtime + topology + infrastructure consume).

Stage E — polish and verification: **S05** (pkg rename + merge — replicas section travels with the merge unchanged), **S06** (per-node sections rename + storage data wiring).

## 13. Follow-ups (deferred, not in this phase)

- **RFC 0026 — Nomad-aligned NodeStatus.** New states `initializing`, `ready`, `disconnected`, `down`; structured `drain` object; `eligibility` field; `lastHeartbeatAt`. Three-story sequence per `docs/research/nomad-node-management.md`.
- **RFC 0027 — True topology graph.** Reactflow / SVG nesting. Replaces today's pool-card grid with parent → child topology edges.
- **RFC 0028 — Workload (Service) domain port.** Wires the Services section on node-detail to real data. New table `public.node_workload` with RLS.
- **RFC 0029 — Replicas standalone app + real backend.** Promotes replicas out of Infrastructure → Settings into a dedicated app. Adds `Replica` domain entity, `IReplicaRepository`, server route, Supabase persistence + RLS. Phase 1 leaves the MSW handler shape unchanged so this RFC is a structural extraction + backend wiring.
- **Pool-level metadata.** If product confirms a need for pool descriptions / capacity-min / owner, swap the VIEW for a real table. Adapter swap only.

---

## Changelog

(Empty — populated by `/finish-story` on first deviation.)
