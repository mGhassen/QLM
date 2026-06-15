---
story: ./story.md
status: pending
layer: domain
model: sonnet
files:
  - packages/domain/src/entities/pool.type.ts
  - packages/domain/src/usecases/fleet/fleet-summary.dto.ts
  - packages/domain/src/services/fleet/fleet-aggregate.usecase.ts
  - packages/repositories/supabase/src/pool.repository.ts
  - apps/web/src/lib/msw/handlers/pools.ts
  - packages/features/ops/topology/src/application/use-topology-data.ts
  - packages/features/ops/topology/src/presentation/components/topology-pool-card.stories.tsx
  - packages/features/ops/topology/src/application/constants.ts
  - packages/features/ops/infrastructure/src/application/constants.ts
validation:
  kind: typecheck-only
---

# Drop `statusCounts` from Pool + FleetSummary, prune deprecated TS constants

The transitional `statusCounts` field is no longer read by any caller
after task 008. This task removes the field from `Pool`, `FleetSummary`,
their adapter populators, MSW, and the topology join layer. Plus deletes
the deprecated TS constants kept alongside (`STATUS_DOT`, `STATUS_TILE`,
`STATUS_FILL` in topology, `STATUS_BADGE_CLASSES` in infrastructure).
`POOL_COUNTED_STATUSES` removed too.

## Done when

- [ ] `Pool.statusCounts`, `FleetSummary.statusCounts` fields gone.
- [ ] `PoolStatusCountsSchema`, `PoolStatusCounts`, `POOL_COUNTED_STATUSES` removed.
- [ ] `STATUS_DOT` / `STATUS_TILE` / `STATUS_FILL` removed from topology constants. `STATUS_BADGE_CLASSES` removed from infrastructure constants.
- [ ] Pool supabase adapter no longer reads `running_count` / `draining_count` / `stopped_count` / `error_count`.
- [ ] MSW `pools.ts` no longer emits `statusCounts`.
- [ ] `TopologyPool` type loses `statusCounts`.
- [ ] Pool card stories no longer pass `statusCounts`.
- [ ] `pnpm typecheck` + `pnpm test` green.

## Notes

- `FleetAggregateService.summary` keeps its `lifecycleCounts` + `healthCounts` populators. The `statusCounts` accumulator + return field are deleted in this task.
