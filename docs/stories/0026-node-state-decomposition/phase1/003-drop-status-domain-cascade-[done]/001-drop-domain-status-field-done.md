---
story: ./story.md
status: pending
layer: domain
model: sonnet
files:
  - packages/domain/src/entities/node.type.ts
  - packages/domain/src/usecases/dto/node-usecase-dto.ts
  - packages/domain/src/services/node/change-node-status.usecase.ts
  - packages/domain/src/services/node/index.ts
  - packages/domain/src/entities/index.ts
validation:
  kind: domain-test
  specs:
    - packages/domain/__tests__/services/node/derive-health.test.ts
    - packages/domain/__tests__/services/node/state-decomposition-services.test.ts
---

# Drop `Node.status` / `NodeStatus` / `Node.healthState`

Removes the legacy single-axis status from the domain layer. `NodeStatus`
type, `NODE_STATUSES` constant, `Node.status` Zod field + class field,
`Node.healthState` (subsumed by computed `health`),
`ChangeNodeStatusInput`/`ChangeNodeStatusService` all gone.

## Done when

- [ ] `NodeSchema` no longer has `status` or `healthState` fields.
- [ ] `NODE_STATUSES`, `NodeStatus`, `NODE_HEALTH_STATES`, `NodeHealthState` not exported.
- [ ] `change-node-status.usecase.ts` + `ChangeNodeStatusInput` DTO deleted.
- [ ] Domain barrel updated; `pnpm --filter @qlm/domain typecheck` green.
- [ ] All domain tests still pass.

## Notes

- Adapters + features still reference `NodeStatus` until tasks 002–008 land — typecheck WILL be red until then. This task closes when domain typechecks alone; integration green is enforced at story close.
