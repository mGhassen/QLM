---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/domain/src/entities/pool.type.ts
  - packages/domain/src/services/fleet/aggregate.usecase.ts
  - packages/repositories/supabase/src/pool.repository.ts
  - apps/web/src/lib/repositories/pool.repository.ts
  - apps/web/src/lib/msw/handlers/pools.ts
  - packages/features/ops/topology/src/presentation/components/pool-card.tsx
  - packages/features/ops/topology/src/presentation/components/fleet-summary.tsx
  - packages/features/ops/topology/src/presentation/components/pressure-list.tsx
  - packages/features/ops/topology/src/application/constants.ts
  - packages/i18n/src/locales/en/topology.json
  - apps/web/e2e/node-drain.spec.ts
validation:
  kind: e2e
  specs:
    - apps/web/e2e/node-drain.spec.ts
---

# Topology pool aggregations + drain e2e

`Pool.statusCounts` is replaced by `lifecycleCounts` + `healthCounts` (Pool
entity, both Supabase + HTTP adapters, MSW). `FleetAggregateService.summary`
returns the new shape. `PressurePoint.kind` vocabulary expands per spec §5.6.
Topology pool card swaps the status distribution bar for a health
distribution + lifecycle dot row. Constants `STATUS_*` rename to `HEALTH_*`
+ add `LIFECYCLE_*`. End-to-end test exercises drain → countdown → cancel →
eligibility-chip flip.

## Done when

- [ ] `Pool` entity reflects the new shape; old `statusCounts` removed (story 003 drops the trigger; nothing reads it now).
- [ ] Supabase + HTTP adapters + MSW all return the new aggregate counts from `pool_view`.
- [ ] Pool card distribution bar consumes `healthCounts`; lifecycle row reads `lifecycleCounts`.
- [ ] Fleet summary distribution + pressure list rendered with the new vocabulary; constants renamed.
- [ ] All `node.status` / `pool.statusCounts` references removed from `packages/features/ops/topology/src` — `grep` returns zero hits.
- [ ] `node-drain.spec.ts` passes: `pnpm --filter web e2e -- apps/web/e2e/node-drain.spec.ts`.
- [ ] i18n keys for the new vocabulary added to `nodes.json` + `topology.json`.

## Notes

- `FleetAggregateService` may keep `statusCounts` as a transitional convenience for one release if any external consumer reads it — gate it behind a `// TODO(story 003): remove`. Otherwise remove now.
- Distribution bar tones reuse the design-system status palette in `constants.ts` (no inline hexes).
