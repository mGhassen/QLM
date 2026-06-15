---
story: ./story.md
status: pending
layer: ui
model: haiku
files:
  - packages/ui/src/guepard/shell/project-shell-tab-bar.stories.tsx
validation:
  kind: typecheck-only
---

# Add tab-bar Storybook story

Mandatory per `.claude/rules/testing.md` §Storybook for any change in `packages/ui/**`.

## Done when

- [ ] `packages/ui/src/guepard/shell/project-shell-tab-bar.stories.tsx` exists.
- [ ] Three stories: `Default` (5 unpinned, third active), `WithPinnedTabs` (2 pinned + 3 unpinned, first unpinned active), `ManyTabsOverflow` (15 tabs).
- [ ] All callbacks (`onTabClick`, `onTabClose`, `onTabPin`, `onTabReorder`, `onNewTab`) wired to `action()`.
- [ ] `pnpm typecheck` and `pnpm --filter @guepard/ui storybook` build green.

## Notes

- Mirror Storybook scaffolding from a configured neighbor — e.g. `packages/ui/src/guepard/data-table-advanced/data-table-advanced.stories.tsx`.
- `action` from `@storybook/test`.
