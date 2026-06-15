---
story: ./story.md
status: pending
layer: features
model: sonnet
files:
  - packages/features/ops/infrastructure/src/presentation/story-fixtures.ts
  - packages/features/ops/infrastructure/src/presentation/components/details-sheet.stories.tsx
  - packages/features/ops/infrastructure/src/presentation/components/metrics-sparkline.stories.tsx
  - packages/features/ops/infrastructure/src/presentation/plugin-root.stories.tsx
validation:
  kind: typecheck-only
---

# Rewrite Storybook fixtures off `node.status`

## Done when

- [ ] `story-fixtures.ts` no longer writes `status` or `healthState` on `Node` fixtures. Emits 5-axis fixtures: `lifecycle`, `orchestration`, `eligibility`, `drain?`, `health`.
- [ ] `details-sheet.stories.tsx` arg shapes match the new fixture shape.
- [ ] `metrics-sparkline.stories.tsx` arg shapes match.
- [ ] `plugin-root.stories.tsx` arg shapes match.
- [ ] `pnpm --filter @qlm/infrastructure typecheck` is fully green (zero errors).
- [ ] `pnpm typecheck` (whole repo) is green — closes story 004's primary acceptance criterion.

## Notes

- Mirror the seed-kind helper in `apps/web/src/lib/msw/fixtures/nodes.ts` (committed story 003): a local `SeedKind` literal type drives lifecycle / orchestration / eligibility / drain / health derivation. No `NodeStatus` import.
- Storybook stories don't need every fixture variant — keep what's already there; just translate axis values.
- Run the per-pkg storybook to eyeball the badge colors after rewrite: `pnpm --filter @qlm/infrastructure storybook`.
