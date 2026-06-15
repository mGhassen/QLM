---
story: ./story.md
status: pending
layer: domain
model: sonnet
files:
  - packages/domain/src/usecases/fleet/pressure-point.dto.ts
  - packages/domain/src/services/fleet/fleet-aggregate.usecase.ts
  - packages/features/ops/topology/src/presentation/components/topology-pressure-list.tsx
validation:
  kind: typecheck-only
---

# Drop `PressurePointKind` legacy aliases (`high-cpu`, `high-mem`, `down`)

Story 002 left `'high-cpu' | 'high-mem' | 'down'` alongside the new
vocabulary as a transition shim. This task removes them. `FleetAggregateService.computePressurePoints` already emits the new
kinds; this is callers + types only.

## Done when

- [ ] `PressurePointKind` is exactly `'unreachable' | 'failing' | 'criticalHealth' | 'highCpu' | 'highMem'`.
- [ ] `TopologyPressureList` `KIND_LABEL_KEY` / `KIND_TONE` / `PressureIcon` entries for the legacy aliases removed.
- [ ] `topology.pressure.down` i18n key removed.
- [ ] `pnpm typecheck` green.

## Notes

- `FleetAggregateService.computePressurePoints` was already rewritten to emit `'unreachable'` (replaces `'down'`). Adapter chain unchanged.
