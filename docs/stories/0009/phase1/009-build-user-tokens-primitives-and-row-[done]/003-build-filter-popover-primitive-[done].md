---
story: ./story.md
status: pending
layer: features
files:
  - packages/features/user-tokens/src/components/primitives/filter-popover.tsx
  - packages/features/user-tokens/src/components/primitives/filter-popover.stories.tsx
  - packages/features/user-tokens/__tests__/filter-popover.test.tsx
  - packages/features/user-tokens/src/components/index.ts
---

# Build FilterPopover primitive

## Purpose

Generic multi-select popover used by Story 010's toolbar for both the Status filter and the Scopes filter. Lives here (in the user-tokens feature) instead of `@qlm/ui` because phase 1 has only this one consumer; promote later if a second consumer appears.

## Files

- `packages/features/user-tokens/src/components/primitives/filter-popover.tsx`:
  - Generic over `T extends string`. Props: `{ label: string; options: ReadonlyArray<{ value: T; label: string }>; selected: ReadonlyArray<T>; onChange: (next: T[]) => void; }`.
  - Renders a `@qlm/ui/button` with `variant="outline"` showing `label` + a `@qlm/ui/badge` with the selected count when `> 0`.
  - Clicking opens a `@qlm/ui/popover`; body is a vertically-stacked list of `@qlm/ui/checkbox` items, one per option.
  - Toggling a checkbox calls `onChange(next)` with the new selected array (immutable spread, sorted in option-declaration order so the parent can compare arrays cheaply).
  - `Readonly<Props>`.
- `packages/features/user-tokens/src/components/primitives/filter-popover.stories.tsx`:
  - `meta.title = 'UserTokens/Primitives/FilterPopover'`, decorator = `withUserTokensProviders`.
  - Stories: `Empty` (no selection — no badge count), `SomeSelected` (status filter with 2/3 selected — visible badge `2`).
- `packages/features/user-tokens/__tests__/filter-popover.test.tsx`:
  - Render with both `UserTokenStatus[]` AND `UserTokenScope[]` shape to prove the generic.
  - Toggling a checkbox calls `onChange` with the right new array.
  - Badge count appears only when ≥1 selected.
- `packages/features/user-tokens/src/components/index.ts` — extend with `FilterPopover`.

## Acceptance

- [ ] `pnpm --filter @qlm/user-tokens typecheck` passes (generic narrows correctly with both option-type unions).
- [ ] `pnpm --filter @qlm/user-tokens test` passes.
- [ ] No hardcoded English strings (the `label` is provided by the parent; option labels also come from the parent).
- [ ] Component is fully controlled — no internal "selected" state.
- [ ] `Readonly<Props>`.

## Test plan

```
pnpm --filter @qlm/user-tokens typecheck
pnpm --filter @qlm/user-tokens test
```

## Storybook validation

- **Command**: `pnpm --filter @qlm/storybook-config storybook`
- **Story titles to inspect**: `UserTokens / Primitives / FilterPopover / Empty`, `… / Some Selected`
- **Expected visual outcome**: an outline button labelled "Status" — empty story shows no badge, "some selected" shows a small badge with the count `2`. Clicking opens a checkbox list.

## Notes

- The `onChange` array order is option-declaration order, not click order — keeps prop equality stable across re-renders.
- "Promote to `@qlm/ui`" is deferred until a second consumer appears; tracking note in the story Questions section.
