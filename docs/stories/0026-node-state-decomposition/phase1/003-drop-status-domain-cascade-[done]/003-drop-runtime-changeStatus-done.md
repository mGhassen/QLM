---
story: ./story.md
status: pending
layer: shell
model: sonnet
files:
  - packages/shell-runtime/src/resources/nodes.ts
validation:
  kind: typecheck-only
---

# Drop `shell.nodes.changeStatus`

The mutation is no longer reachable — service deleted in task 001, port
method deleted in task 002. Runtime caller surface follows.

## Done when

- [ ] `shell.nodes.changeStatus` no longer exposed.
- [ ] No imports of `ChangeNodeStatusService` or `ChangeNodeStatusInput` remain.
- [ ] `pnpm --filter @qlm/shell-runtime typecheck` green.

## Notes

- Cache invalidation paths unchanged — the new mutations (drain, drainCancel, setEligibility, setLifecycle) already invalidate `nodes.detail` / `nodes.list` / `['fleet']`.
