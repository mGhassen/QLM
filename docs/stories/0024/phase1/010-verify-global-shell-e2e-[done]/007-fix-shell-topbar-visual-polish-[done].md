---
story: ./story.md
status: done
layer: bugfix
model: sonnet
parent_task: 005-add-shell-dropdown-e2e-spec-[pending].md
files:
  - packages/features/shell-topbar/src/shell-topbar.tsx
  - packages/features/shell-topbar/src/dropdown-menu.tsx
  - packages/features/settings-shell/src/components/settings-dialog.tsx
validation:
  kind: typecheck-only
---

# Fix: shell-topbar visual polish (z-index, border, settings-dialog i18n)

## Reproduction

During live testing of story 010, three regressions surfaced alongside the dropdown feature:

1. The topbar dropdown rendered **behind** settings-shell content — `z-50` on the Popover wasn't enough to escape a higher stacking context in the shell.
2. The dropdown menu container had a visible `border` class that looked inconsistent with the rest of the app's popovers.
3. The user-settings dialog showed raw i18n keys (`dialog.title`, `nav.personalTokens`) instead of translated strings — the `settings` namespace wasn't lazy-loading because `SettingsDialog` called `useTranslation()` without specifying the namespace.

## Likely cause

1. Some parent stacking context sits at `z-50`. Bumping to `z-[60]` restores the expected overlay order.
2. Copy-paste from an older popover pattern — `border` was never intentional on this dropdown.
3. `useTranslation()` without a namespace registers interest only in the default namespace. Namespaced keys like `'settings:dialog.title'` resolve once but don't trigger lazy-load of the `settings` namespace, so sibling `t('nav.personalTokens')` calls from a child fail.

## Files touched

- `packages/features/shell-topbar/src/shell-topbar.tsx` — bump Popover `z-50` → `z-[60]`.
- `packages/features/shell-topbar/src/dropdown-menu.tsx` — drop `border` class from the menu container.
- `packages/features/settings-shell/src/components/settings-dialog.tsx` — `useTranslation()` → `useTranslation('settings')` so the namespace is requested explicitly.

## Done when

- [x] `pnpm typecheck` green (51/51).
- [x] Dropdown renders above settings content in preview.
- [x] Dropdown no longer shows a stray border.
- [x] Settings dialog shows translated strings.

## Notes

- Does not unblock task 005 — the e2e spec was shipped as a scaffold; the fix here is independent UI polish.
- Issue 5 (dropdown navigation not working on some items) and issue 2 (workspace-not-ready panel) are separate — see story Notes.
