---
story: ./story.md
status: pending
layer: features
model: sonnet
files:
  - packages/features/ops/infrastructure/src/index.ts
  - packages/features/ops/infrastructure/src/application/view-state.serde.ts
  - packages/features/ops/infrastructure/src/application/constants.ts
validation:
  kind: typecheck-only
---

# Drop status barrel re-exports + serde + transitional constants

## Done when

- [ ] `src/index.ts` no longer re-exports `NODE_STATUSES`, `NODE_HEALTH_STATES`, `NodeStatus`, `NodeHealthState`.
- [ ] `view-state.serde.ts` no longer imports / serializes `NodeStatus`-keyed view state.
- [ ] `application/constants.ts` deprecated `STATUS_BADGE_CLASSES` removed (or commented as moved to lifecycle).
- [ ] `pnpm --filter @qlm/infrastructure typecheck` reduces error count vs baseline.

## Notes

- Smallest surface — start here. Errors in barrel + serde are leaf-level: deleting them does not break callers, callers were broken already (RFC 0026 story 003 shipped the type deletes).
- `STATUS_BADGE_CLASSES` was the transitional palette during story 002's switchover. If a callsite still imports it, replace with `HEALTH_STATUS_BADGE_CLASSES` or `LIFECYCLE_BADGE_CLASSES` (already shipped story 002).
