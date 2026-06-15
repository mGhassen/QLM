---
story: ./story.md
status: pending
layer: shell
files:
  - apps/web/src/components/settings-dialog-mount.tsx
  - apps/web/src/routes/__root.tsx
  - apps/web/src/routes/organizations.tsx
  - apps/web/src/shell/project-shell-host.tsx
  - apps/web/package.json
---

# Wire SettingsDialogMount in apps/web + replace stub handlers

## Purpose

Single mount point that owns dialog open/close state, exposes a `useSettingsDialog().open()` opener via context, and registers the phase-1 "Personal tokens" section with a stub placeholder pane. Replaces the Story-001 task-003 stub `console.log('open settings')` handlers in both account-menu call sites.

## Files

- `apps/web/src/components/settings-dialog-mount.tsx`:
  - `SettingsDialogContext` (`React.createContext`) exposes `{ open: () => void; close: () => void }`.
  - `useSettingsDialog()` hook reads it; throws if missing.
  - Internal state: `open: boolean` + `defaultSectionKey` set to `'personal-tokens'`.
  - Composes `<DirtyStateProvider><SettingsDialog ...><TokensPanePlaceholder /></SettingsDialog></DirtyStateProvider>` (placeholder lives in the same file as a tiny stub div with `data-test="tokens-pane-placeholder"` + a localized "Coming in Story 011" message — keep it small and obvious).
  - Sections array: `[{ key: 'personal-tokens', label: t('settings:nav.personalTokens'), content: <TokensPanePlaceholder /> }]`.
  - Renders `<SettingsDialogContext.Provider>` wrapping `props.children` AND the `<SettingsDialog>` (so opener-context is available and the dialog mounts at root).
- `apps/web/src/routes/__root.tsx` — wrap the existing root content with `<SettingsDialogMount>`.
- `apps/web/src/routes/organizations.tsx` — replace the Story-001 task-003 stub `onSettingsClick` handler with a `const dialog = useSettingsDialog(); ...; onSettingsClick={() => dialog.open()}` call.
- `apps/web/src/shell/project-shell-host.tsx` — same replacement on the shell-context account menu.
- `apps/web/package.json` — add `@qlm/settings-shell: "workspace:*"`.

## Acceptance

- [ ] `pnpm --filter web typecheck` passes.
- [ ] Both account menus' "Settings" item now opens the dialog (no remaining `console.log('open settings')` stubs).
- [ ] The dialog renders the "Personal tokens" sidebar entry; the right outlet shows the placeholder.
- [ ] X / Escape / overlay click all close the dialog (placeholder has nothing dirty so the discard guard does NOT fire).
- [ ] No new SearchEngineSelect or other unrelated route changes.

## Test plan

```
pnpm install
pnpm --filter web typecheck
pnpm web:dev
# Manual: open menu → click Settings → dialog opens → close via X.
```

## Storybook validation

N/A — wiring task. The `<SettingsDialog>` itself is visually validated in task 002's stories.

## Notes

- The placeholder pane is intentionally trivial — Story 011 swaps in `<TokensSettingsPane>` from `@qlm/user-tokens/components` without changing this file's structure.
- If `useUser()` is missing on a page that hosts the menu (so the opener can't fire), prefer rendering nothing for "Settings" rather than a no-op handler.
- The Story-001 TODO(story-010) comments in `organizations.tsx` and `project-shell-host.tsx` are the search anchors for the replacement.
