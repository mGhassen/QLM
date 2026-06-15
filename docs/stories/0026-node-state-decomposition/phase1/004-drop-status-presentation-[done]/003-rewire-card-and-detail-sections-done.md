---
story: ./story.md
status: pending
layer: features
model: sonnet
files:
  - packages/features/ops/infrastructure/src/presentation/components/card.tsx
  - packages/features/ops/infrastructure/src/presentation/components/detail-cpu-section.tsx
  - packages/features/ops/infrastructure/src/presentation/components/detail-memory-section.tsx
  - packages/features/ops/infrastructure/src/presentation/components/detail-storage-section.tsx
  - packages/features/ops/infrastructure/src/presentation/components/detail-page.tsx
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/infrastructure
  expect_console: empty
---

# Rewire card + detail-page off `node.status`

## Done when

- [ ] `card.tsx` reads `getNodeDisplayState(node)` for the badge tone + identity tile color. No `node.status` references.
- [ ] `detail-cpu-section.tsx`, `detail-memory-section.tsx`, `detail-storage-section.tsx` replace `node.status === 'running'` reads with `node.lifecycle === 'active'`.
- [ ] `detail-page.tsx` reads `getNodeDisplayState(node)` for hero badge. No `node.status` reads.
- [ ] Card grid renders. Detail page (right sheet) renders. Status badge tone matches the new 8-kind palette (`inactive | unreachable | critical | draining | ineligible | degraded | running | pending`).

## Notes

- `getNodeDisplayState` precedence: `inactive > unreachable > critical > draining > ineligible > degraded > running > pending`. Don't reorder.
- Subsection cards previously hid metrics for `status === 'stopped'`. New gate is `node.lifecycle === 'stopped'`.
