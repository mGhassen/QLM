---
spec: docs/specs/0007-notebook-editor-phase1.md
spec_sections:
  - "#32-screen-by-screen"
  - "#75-presentation--feature-package-packagesfeaturesnotebook"
  - "#11-i18n-key-map"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks: []
blocked_by:
  - 001-wire-tailwind-source-scope
---

# Build cell chrome and divider

## Goal

Render each query cell with the polished chrome described in the spec — language badge, hover-revealed editable title, tooltipped footer toolbar, More-menu Duplicate entry, and a Run button whose disabled state explains itself — and redesign `CellDivider` so every divider shows a visible `+` affordance at rest with three typed buttons fanning out on hover.

## Scope

**In scope**
- `packages/features/notebook/src/components/notebook-cell.tsx`
  - `useTranslation('notebooks')` and the new `Tooltip*` imports.
  - `SQL` language pill in the query-cell header next to "Cell N".
  - Title pencil at `opacity-60 hover:opacity-100` so it's always discoverable.
  - Run button wrapped in a Tooltip that switches between "Run cell (⌘↵)" and "Select a datasource to run" based on the disabled state. The Run button is wrapped in a `<span tabIndex={0}>` so the tooltip fires through the disabled child.
  - Tooltip wrappers around AI / Format / Copy / Delete / More icon buttons.
  - **Duplicate cell** entry in the More dropdown wired to the existing `onDuplicate` handler (parameter renamed from `_onDuplicate` to `onDuplicate` so it's actually consumed).
  - i18n keys for every new string introduced by this story.
- `packages/features/notebook/src/components/cell-divider.tsx`
  - Always-visible muted `+` circle on a thin gradient line at rest.
  - On hover the `+` fades and three rounded buttons (Code / Markdown / Prompt) fan in via the existing animation.
  - i18n keys for the three button labels and the divider sr-label.
- `apps/web/src/lib/i18n/locales/en/notebooks.json`
  - New `cell.type.*`, `cell.actions.*`, `divider.*`, `unsaved`, `editTitle` keys (see spec §11).

**Out of scope**
- Language badges on text/prompt cells → query cells only in phase 1 (resolved question §1.7).
- Migration of pre-existing hardcoded strings inside `notebook-cell.tsx` (`'Cell title…'`, `'Edit title'`, etc.) → phase 2 i18n sweep.
- Tabbed result panel → story 004.
- TooltipProvider wrap → story 007.

## Acceptance criteria

- [x] Each query cell shows a `SQL` pill in its header next to "Cell N".
- [x] The title pencil is visible at rest at 60% opacity and brightens on hover.
- [x] Hovering each footer icon (AI / Format / Copy / Delete / More) shows a tooltip with the localised label.
- [x] The Run button shows "Run cell (⌘↵)" when enabled and "Select a datasource to run" when disabled because no datasource is picked.
- [x] The cell's More menu contains a **Duplicate cell** entry that calls the parent's `handleDuplicateCell`.
- [x] At rest, every cell divider (between cells and the trailing one) shows a small `+` marker; on hover it fans out into Code / Markdown / Prompt buttons.
- [x] Every new user-facing string is wrapped in `t('notebooks.…')`.
- [x] `pnpm --filter @guepard/notebook typecheck` is clean (modulo unrelated baseline errors).

## Tasks

Shipped files:

- `packages/features/notebook/src/components/notebook-cell.tsx` — chrome polish, badge, tooltips, Duplicate menu item.
- `packages/features/notebook/src/components/cell-divider.tsx` — baseline `+` + hover fan-out.
- `apps/web/src/lib/i18n/locales/en/notebooks.json` — new keys.

## Demo / verification

```bash
pnpm web:dev
```

1. Open a notebook with one query cell.
2. Confirm the `SQL` pill, the always-visible pencil, and the Run-button disabled tooltip with no datasource.
3. Hover footer icons → tooltips render.
4. Open More → Duplicate cell → a copy is inserted directly below.
5. Hover any cell divider → `+` fades, three typed buttons fan in.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
