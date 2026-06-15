---
story: ./story.md
status: pending
layer: features
model: sonnet
files:
  - packages/features/ops/infrastructure/src/presentation/components/details-sheet.tsx
  - packages/features/ops/infrastructure/src/presentation/components/command-palette.tsx
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/infrastructure
  expect_console: empty
---

# Rewire details sheet + command palette off `node.status`

## Done when

- [ ] `details-sheet.tsx` no longer renders a status quick-action row backed by `NODE_STATUSES`. Replace with the lifecycle / eligibility / drain panels already shipped story 002 (`LifecycleControl`, `EligibilityChip`, `DrainPanel`).
- [ ] `details-sheet.tsx` no longer reads `node.status` (8 hits resolved).
- [ ] Implicit-any on `details-sheet.tsx:355` parameter `s` typed.
- [ ] `command-palette.tsx` quick-filter shortcuts switch from `status:in:[…]` to `lifecycle:in:[…]` + `eligibility:in:[…]`.
- [ ] Details sheet renders all six sections (identity, lifecycle, eligibility, drain, health, metrics) with no console error.

## Notes

- "Stop / Start / Restart" CTAs land via `setLifecycle`. "Drain" CTA opens the drain dialog, which then calls `drain({ deadline, ignoreSystemJobs, force, setIneligibleOnStart: true })`.
- Eligibility chip stays interactive during drain (RFC §5.5a). Label flips: "Ineligible (drained)" / "Eligible despite drain" / "Eligible" / "Ineligible".
- Command palette doesn't need a separate `displayState` filter shortcut — operators filter by individual axes.
