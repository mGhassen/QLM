---
story: ./story.md
status: pending
layer: ui
model: sonnet
files:
  - packages/ui/src/guepard/shell/project-shell-tab-bar.tsx
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/infrastructure
  expect_console: empty
---

# Add grip-handle activator to SortableTabBarItem

Move the dnd activator off the click `<button>` and onto a small leading grip element on unpinned tabs.

## Done when

- [ ] `useSortable` returns `setActivatorNodeRef`; that ref is the only place `{...listeners}` is spread.
- [ ] `<button>` keeps `{...attributes}` (a11y) but no longer carries `{...listeners}`.
- [ ] Unpinned tabs render a leading 12-pixel `GripVertical` element with `setActivatorNodeRef` + `{...listeners}`. Element classes: `flex h-3.5 w-3 shrink-0 items-center justify-center text-muted-foreground/40 cursor-grab opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing`. The button gets `group` so the grip reveals on hover.
- [ ] Pinned tabs spread `{...listeners}` on the button (entire surface stays as activator). Pin icon is the visible grip cue.
- [ ] `PointerSensor` activation distance stays at 5 px.
- [ ] `onAuxClick` middle-click close behavior is unchanged.
- [ ] `pnpm typecheck` is green.

## Notes

- Reference pattern: `packages/features/notebook/src/components/notebook-ui.tsx:194-301` already uses `setActivatorNodeRef` for the same separation.
- `aria-label="Drag to reorder"` on the grip span; `aria-hidden` on the icon.
