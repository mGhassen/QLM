---
spec: docs/specs/0025-ops-compute-refactor-phase1.md
spec_sections:
  - "#5-conceptual-model"
  - "#51-data-shapes"
  - "#6-data-model"
  - "#71-domain-packagesdomain"
  - "#72-adapters-packagesrepositories-and-appsweb-srclibrepositories"
  - "#74-server-appsserver"
status: pending
started: null
finished: null
blocks: ["004-fleet-runtime-resource", "005-infrastructure-pkg-rename"]
blocked_by: []
---

# Promote Pool to a domain entity

## Goal

Replace the React-layer `TopologyPool` synthesis with a first-class `Pool` domain entity backed by a Postgres VIEW, exposed through `IPoolRepository`, `ListPoolsByProjectService`, and `shell.pools`.

## Scope

**In scope**

- New `packages/domain/src/entities/pool.type.ts` with `PoolSchema`, `Pool`, `PoolEntity`.
- New `packages/domain/src/repositories/pool-repository.port.ts` with `IPoolRepository.findByProjectId`.
- New `packages/domain/src/services/pool/list-pools-by-project.usecase.ts`.
- New `apps/web/supabase/schemas/46-platform-pools.sql` defining `public.pool_view` with `security_invoker = true` aggregating per `(organization_id, node_pool, hosting_provider, region)`.
- New Supabase adapter `packages/repositories/supabase/src/pool.repository.ts`.
- New HTTP adapter `apps/web/src/lib/repositories/pool.repository.ts`.
- New server route `apps/server/src/routes/pools.ts` (`GET /api/pools?projectId=<id>`).
- New runtime resource `packages/shell-runtime/src/resources/pools.ts` with `shell.pools.list`, `keys.listByProject`, `invalidate.list`.
- Wire `pool` into `apps/web/src/lib/repositories-factory.ts` and `packages/domain/src/repositories/repositories.ts`.
- Refactor `packages/features/ops/topology/src/application/use-topology-data.ts` to consume `shell.pools.list()` for the pool list (the aggregate stays as-is here — story 004 replaces it with `shell.fleet.summary`).
- Update `packages/features/ops/topology/src/presentation/components/topology-pool-card.tsx`, `topology-pool-sheet.tsx` to consume the new `Pool` type. Drop the local `TopologyPool` type.

**Out of scope**

- `FleetAggregateService` and `shell.fleet`. Story 004.
- TopologyAggregate replacement. Story 004.
- `node_pool` writable table. Phase 2.

## Acceptance criteria

- [ ] `packages/domain/src/entities/pool.type.ts` ships and is re-exported from the entities barrel.
- [ ] `packages/domain/__tests__/services/pool/list-pools-by-project.test.ts` covers happy path + empty project.
- [ ] `apps/web/supabase/schemas/46-platform-pools.sql` defines `pool_view` with `security_invoker = true`. After `pnpm supabase:web:reset && pnpm supabase:web:typegen`, `Database['public']['Views']['pool_view']` exists in the generated types.
- [ ] `GET /api/pools?projectId=<id>` returns `{ items: Pool[] }` with 200; 401 on no session; 403 on cross-org access; 404 on missing project.
- [ ] `apps/server/__tests__/pools.test.ts` covers all four status codes.
- [ ] `useTopologyData` no longer calls `groupIntoPools` for the pool list — it reads `shell.pools.list()`. The `aggregate` block is unchanged in this story (story 004 replaces it).
- [ ] Topology pool drill-through still works end-to-end with localized titles.
- [ ] `pnpm typecheck && pnpm test` green.

## Tasks

1. [001-add-pool-domain-types](001-add-pool-domain-types-pending.md)
2. [002-add-pool-view-sql](002-add-pool-view-sql-pending.md)
3. [003-implement-pool-adapters](003-implement-pool-adapters-pending.md)
4. [004-add-pools-server-route](004-add-pools-server-route-pending.md)
5. [005-add-pools-runtime-resource](005-add-pools-runtime-resource-pending.md)
6. [006-refactor-topology-feature](006-refactor-topology-feature-pending.md)

## Demo / verification

```
pnpm supabase:web:reset
pnpm supabase:web:typegen
pnpm typecheck
pnpm --filter @qlm/domain test
pnpm --filter server test __tests__/pools.test.ts
pnpm dev
# Open http://localhost:3000/prj/<slug>/topology
# Pool cards render with same data as before. Network tab shows GET /api/pools.
# Confirm pool drill sheet still opens, capacity numbers identical to pre-refactor.
```

## Questions surfaced

(none yet)
