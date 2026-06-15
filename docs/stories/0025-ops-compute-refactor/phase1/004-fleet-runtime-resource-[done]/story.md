---
spec: docs/specs/0025-ops-compute-refactor-phase1.md
spec_sections:
  - "#51-data-shapes"
  - "#71-domain-packagesdomain"
  - "#73-shell-runtime-packagesshell-runtime"
  - "#75-presentation--feature-packages"
status: pending
started: null
finished: null
blocks: ["005-infrastructure-pkg-rename"]
blocked_by: ["003-pool-domain-entity"]
---

# Add shell.fleet runtime resource

## Goal

Stop deriving fleet aggregates inline in React hooks. New `FleetAggregateService` in domain composes `INodeRepository` + `IPoolRepository`. Runtime exposes `shell.fleet.summary | pools | pressurePoints`. Topology + Infrastructure consume one source of truth.

## Scope

**In scope**

- New `packages/domain/src/services/fleet/fleet-aggregate.usecase.ts` with `FleetAggregateService.{summary, pools, pressurePoints}`.
- New DTOs `packages/domain/src/usecases/fleet/{fleet-summary.dto.ts, pressure-point.dto.ts, index.ts}`.
- New runtime resource `packages/shell-runtime/src/resources/fleet.ts` exposing `shell.fleet.{summary, pools, pressurePoints, invalidate}`.
- Refactor `packages/features/ops/topology/src/application/use-topology-data.ts` to consume `shell.fleet.summary` and `shell.fleet.pressurePoints` (drop `computeAggregate`).
- Refactor topology presentation to use the new `FleetSummary` shape (replace `aggregate: TopologyAggregate` props with `summary: FleetSummary`).
- Add a `TopologyPressureList` component above the attention CTA in `topology-fleet-summary.tsx`.
- Hardcode pressure-point thresholds as constants in domain: `HIGH_CPU_PCT = 85`, `HIGH_MEM_PCT = 85`.
- Centralize topology status palette in `packages/features/ops/topology/src/application/constants.ts` (eliminate four duplicate `STATUS_*` maps across topology files).
- Add i18n keys `topology.pressure.{highCpu,highMem,down}` to `apps/web/src/lib/i18n/locales/en/topology.json`.

**Out of scope**

- Updating `useInfrastructurePage` to consume `shell.fleet.summary`. Lives in story 005 (the merged Infrastructure pkg).
- Cluster / provider / region row VMs. Stay in feature pkg, scoped to story 005.

## Acceptance criteria

- [ ] `packages/domain/src/services/fleet/fleet-aggregate.usecase.ts` ships with `summary`, `pools`, `pressurePoints` methods.
- [ ] `packages/domain/__tests__/services/fleet/fleet-aggregate.test.ts` covers summary numbers, pressure-point thresholds (85% boundary, no false positives), pool delegation.
- [ ] `shell.fleet.summary(projectId)` returns the same numbers the topology page rendered pre-refactor.
- [ ] `useTopologyData` no longer calls `computeAggregate` or `groupIntoPools`.
- [ ] No file in `packages/features/ops/topology/` declares its own `STATUS_DOT` / `STATUS_TILE` / `STATUS_FILL` map; all consume from `application/constants.ts`.
- [ ] Domain pkg has zero React Query / fetch / Supabase imports — `hex-architecture-reviewer` agent passes.
- [ ] `pnpm typecheck && pnpm test` green.

## Tasks

1. [001-add-fleet-service-and-dtos](001-add-fleet-service-and-dtos-pending.md)
2. [002-add-fleet-runtime-resource](002-add-fleet-runtime-resource-pending.md)
3. [003-refactor-topology-data-hook](003-refactor-topology-data-hook-pending.md)
4. [004-add-pressure-list-component](004-add-pressure-list-component-pending.md)
5. [005-centralize-topology-palette](005-centralize-topology-palette-pending.md)
6. [006-add-pressure-i18n-keys](006-add-pressure-i18n-keys-pending.md)

## Demo / verification

```
pnpm typecheck
pnpm --filter @qlm/domain test
pnpm dev
# Open http://localhost:3000/prj/<slug>/topology
# Fleet summary aside renders identical numbers to pre-refactor.
# A new "Pressure points" section appears above the attention CTA when any node is over 85% CPU or memory.
# pnpm --filter @qlm/topology storybook → topology-fleet-summary story renders with FleetSummary args.
```

## Questions surfaced

(none yet)
