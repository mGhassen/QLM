---
spec: docs/specs/0007-notebook-editor-phase1.md
spec_sections:
  - "#75-presentation--feature-package-packagesfeaturesnotebook"
  - "#76-shell-app-packagesappsnotebook"
  - "#32-screen-by-screen"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks: []
blocked_by:
  - 001-wire-tailwind-source-scope
  - 002-wire-notebook-plugin-and-run-path
  - 003-build-cell-chrome-and-divider
---

# Wire notebook header and tooltip provider

## Goal

Make the editor's header render the title with an inline-editable pencil and an unsaved-state indicator, and wrap the entire `NotebookUI` subtree in a `TooltipProvider` so the new Radix-based tooltips inside cells (story 003) have a parent context.

## Scope

**In scope**
- `packages/features/notebook/src/components/notebook-ui.tsx`
  - Wrap the editor's return tree in `<TooltipProvider delayDuration={200}>`.
  - Render a small yellow `Unsaved changes` dot next to the title when the new `hasUnsavedChanges?: boolean` prop is true.
  - Render a hover-revealed pencil and delete trigger next to the title (the title is inline-editable via the existing `Input` swap on click).
  - Add `import { TooltipProvider } from '@guepard/ui/tooltip';`.
- `packages/apps/notebook/src/plugin-root.tsx`
  - Pass `hasUnsavedChanges={updateNotebookMutation.isPending}` to `<NotebookUI>` so the dot reflects an in-flight save.

**Out of scope**
- A real dirty/clean state machine → resolved question §1.5; phase 2 owns the real machine.
- Title editing keybindings → already covered by the existing inline-edit Input.
- Right-side action slot content (Agent, Save, Share, …) → reserved empty in phase 1; the Agent affordance gets its own RFC.

## Acceptance criteria

- [x] The notebook editor wraps its return tree in `<TooltipProvider delayDuration={200}>` so cell tooltips render without `Tooltip` must be used within `TooltipProvider` errors.
- [x] Editing the title or any cell triggers the `update` mutation; while it's in flight, a yellow dot appears next to the title; it disappears once the mutation settles.
- [x] The title pencil is visible at rest at 60% opacity and 100% on hover (matching the cell-header pencil from story 003).
- [x] `pnpm --filter @guepard/notebook typecheck` is clean.

## Tasks

Shipped files:

- `packages/features/notebook/src/components/notebook-ui.tsx` — `TooltipProvider` wrap, unsaved dot, pencil opacity.
- `packages/apps/notebook/src/plugin-root.tsx` — pass `hasUnsavedChanges={updateNotebookMutation.isPending}`.

## Demo / verification

```bash
pnpm web:dev
```

1. Open a notebook. Confirm cell tooltips from story 003 render (no React error in the console).
2. Edit the title. The yellow dot should appear briefly while the save is in flight, then disappear.
3. Hover the title area. The pencil brightens from 60% to 100% opacity.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
