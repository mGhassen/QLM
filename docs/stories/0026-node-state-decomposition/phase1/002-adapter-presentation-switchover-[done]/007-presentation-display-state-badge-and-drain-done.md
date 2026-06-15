---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/ops/infrastructure/src/presentation/lib/get-node-display-state.ts
  - packages/features/ops/infrastructure/__tests__/get-node-display-state.test.ts
  - packages/features/ops/infrastructure/src/presentation/components/health-status-badge.tsx
  - packages/features/ops/infrastructure/src/presentation/components/drain-dialog.tsx
  - packages/features/ops/infrastructure/src/presentation/components/drain-banner.tsx
  - packages/features/ops/infrastructure/src/presentation/components/eligibility-chip.tsx
  - packages/features/ops/infrastructure/src/presentation/components/health-status-badge.stories.tsx
  - packages/features/ops/infrastructure/src/presentation/components/drain-dialog.stories.tsx
  - packages/features/ops/infrastructure/src/presentation/components/drain-banner.stories.tsx
  - packages/features/ops/infrastructure/src/presentation/components/eligibility-chip.stories.tsx
  - packages/i18n/src/locales/en/nodes.json
validation:
  kind: ui-smoke
  route: /node/$id
  expect_console: empty
---

# Build the per-node display vocabulary + drain UI

`getNodeDisplayState(node)` is the single source of truth for what the per-node
header shows: precedence matrix per spec §5.4. `HealthStatusBadge` consumes it.
`DrainDialog`, `DrainBanner`, `EligibilityChip` are the new first-class
operator surfaces. Detail-page action row replaces the old status buttons.

## Done when

- [ ] `getNodeDisplayState` precedence tests (≥10 rows) green per spec §5.4.
- [ ] `HealthStatusBadge` no longer references `node.status`.
- [ ] `DrainDialog` opens with the type-to-confirm flow (project design system §6.3).
- [ ] `DrainBanner` renders countdown when `drain.deadline` is set; updates every second.
- [ ] `EligibilityChip` flips on click, with optimistic UI + rollback on 409.
- [ ] Every new component has a Storybook story per `.claude/rules/testing.md` Storybook section.
- [ ] All user-facing strings go through `t(...)` / `Trans` from `@qlm/ui/trans`.
- [ ] Detail-page UI smoke route is clean (no console exceptions, no unexpected network calls).

## Notes

- `getNodeDisplayState` is pure — accepts `Node`, returns `{ headline, tone, badgeText, secondary? }`. No React, no store reads.
- Storybook coverage: drain dialog (idle / submitting / 409 conflict states), banner (no deadline / countdown / past deadline), eligibility chip (eligible / ineligible / loading).
