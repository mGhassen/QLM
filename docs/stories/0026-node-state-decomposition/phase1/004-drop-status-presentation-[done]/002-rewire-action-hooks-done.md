---
story: ./story.md
status: pending
layer: features
model: sonnet
files:
  - packages/features/ops/infrastructure/src/application/use-actions.ts
  - packages/features/ops/infrastructure/src/application/use-data.ts
  - packages/features/ops/infrastructure/src/application/use-flashing.ts
  - packages/features/ops/infrastructure/src/application/use-page.ts
  - packages/features/ops/infrastructure/src/application/build-columns.tsx
  - packages/features/ops/infrastructure/src/presentation/components/list-page.tsx
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/infrastructure
  expect_console: empty
---

# Rewire infrastructure pkg action hooks off `shell.nodes.changeStatus`

## Done when

- [ ] `use-data.ts` no longer defines a `changeStatus` mutation. Stop / Start / Drain actions go through `shell.nodes.setLifecycle` / `shell.nodes.drain` (already shipped story 002).
- [ ] `use-actions.ts` no longer dispatches `changeStatus`. Action menu surfaces `setLifecycle('stopped')` for Stop, `setLifecycle('active')` for Start, `drain({ ... })` for Drain.
- [ ] `use-flashing.ts` no longer subscribes to `node.status` for flash classes. Replace with `getNodeDisplayState(node)` or `node.lifecycle` change detection.
- [ ] `use-page.ts` no longer reads `node.status`. Selection + filter wiring switches to `node.lifecycle` + `node.eligibility`.
- [ ] `build-columns.tsx` status column replaced with lifecycle column (or removed if the card grid is now the primary surface).
- [ ] List page renders. Stop / Start / Drain actions complete without console error.

## Notes

- `getNodeDisplayState(node)` is the presentation-layer composite for "what's this node doing right now" (RFC 0026 §5.4). Use it for badges + flashing, NOT for filters.
- Filters use individual axes: lifecycle, eligibility. Don't aggregate by displayState (RFC §5.4a invariant).
- Drain action defaults `setIneligibleOnStart: true` (RFC §5.5a recommended UI default).
