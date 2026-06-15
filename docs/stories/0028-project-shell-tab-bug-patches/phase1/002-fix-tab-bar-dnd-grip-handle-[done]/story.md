---
spec: docs/specs/0028-project-shell-tab-bug-patches-phase1.md
spec_sections:
  - "#1-resolved-open-questions"
  - "#3-2-screen-by-screen"
  - "#3-3-user-flows-happy-paths"
status: pending
started: null
finished: null
blocks: []
blocked_by: []
---

# Fix tab-bar drag activator scope (grip handle)

## Goal

A click anywhere on a tab fires `onTabClick` and never `onTabReorder`. Drag-to-reorder is reachable only via a leading grip handle on unpinned tabs (or the pin icon on pinned tabs).

## Scope

**In scope**
- `packages/ui/src/guepard/shell/project-shell-tab-bar.tsx` — refactor `SortableTabBarItem` to use `setActivatorNodeRef` on a small grip element instead of `{...listeners}` on the click button.
- `packages/ui/src/guepard/shell/project-shell-tab-bar.stories.tsx` — new file. Three Storybook stories: `Default`, `WithPinnedTabs`, `ManyTabsOverflow`.
- `packages/ui/src/guepard/shell/project-shell-tab-bar.test.tsx` — new file. Three interaction tests.

**Out of scope**
- Visual redesign of the tab bar.
- Keyboard reordering shortcuts (already exists via context menu Move Left/Right; no change).
- Touch-specific gestures.

## Acceptance criteria

- [ ] Clicking the title region of an inactive tab fires `onTabClick` once and never fires `onTabReorder`.
- [ ] Dragging from the leading grip handle (≥5 px) fires `onTabReorder(activeId, overId)` and never fires `onTabClick`.
- [ ] Pinned tabs do not show a grip; the entire pinned tab still drags.
- [ ] Middle-click close (`onAuxClick`) still works.
- [ ] Storybook story file present, three stories render, action panel logs the right callback per gesture.
- [ ] `pnpm typecheck` and `pnpm --filter @guepard/ui test packages/ui/src/guepard/shell/project-shell-tab-bar.test.tsx` are green.

## Tasks

1. [001-add-grip-handle-activator-to-sortable-tab](001-add-grip-handle-activator-to-sortable-tab-[pending].md)
2. [002-add-tab-bar-storybook-story](002-add-tab-bar-storybook-story-[pending].md)
3. [003-add-tab-bar-interaction-tests](003-add-tab-bar-interaction-tests-[pending].md)

## Demo / verification

1. `pnpm --filter @guepard/ui storybook` — open each new story. Click each tab on the title; observe `onTabClick` only. Drag from grip; observe `onTabReorder` only. Drag from title; observe nothing (no reorder, no click).
2. `pnpm --filter @guepard/ui test packages/ui/src/guepard/shell/project-shell-tab-bar.test.tsx` — three tests green.
3. `pnpm dev` and navigate to any project. Click around the tab bar with intentional pointer drift. Tabs no longer shuffle on click.

## Questions surfaced

- 

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
