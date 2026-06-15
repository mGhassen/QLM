---
story: ./story.md
status: pending
layer: tests
model: sonnet
files:
  - packages/ui/src/qlm/shell/project-shell-tab-bar.test.tsx
validation:
  kind: domain-test
  specs:
    - packages/ui/src/qlm/shell/project-shell-tab-bar.test.tsx
---

# Add tab-bar drag/click separation tests

Vitest + jsdom + `@testing-library/react` + `userEvent`. Pin the regression so future refactors cannot reintroduce the click-eat bug.

## Done when

- [ ] Test 1: clicking the title region of an inactive tab calls `onTabClick` exactly once with that id and does not call `onTabReorder`.
- [ ] Test 2: pointer-down on the grip handle, move ≥30 px to a sibling tab, release → calls `onTabReorder('a', 'b')` exactly once and does not call `onTabClick`.
- [ ] Test 3: pointer-down on the title region (not the grip), move ≥30 px, release → does not call `onTabReorder` and DOES call `onTabClick`.
- [ ] `pnpm --filter @qlm/ui test packages/ui/src/qlm/shell/project-shell-tab-bar.test.tsx` is green.

## Notes

- If `/finish` rejects `kind: domain-test` because the runner targets `@qlm/domain` only, fall back to `kind: typecheck-only` and run the test in the story demo block.
- Use `userEvent.pointer` with explicit coords and `[MouseLeft>]` / `[/MouseLeft]` for drag gestures — `fireEvent` cannot drive dnd-kit's PointerSensor.
