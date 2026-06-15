---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - apps/web/src/components/settings-dialog-mount.tsx
validation:
  kind: typecheck-only
---

# Register server-pane in settings

Mount `<ServerPane />` (built in task 003) into the Settings dialog as a runtime-gated `SettingsSection`. Only desktop runtime sees the section; web stays unchanged.

## Done when

- [ ] `apps/web/src/components/settings-dialog-mount.tsx` adds a `SERVER_PANE_KEY = 'desktop-server'` constant and computes the sections array conditionally:
  - When `useRuntime() === 'desktop'`, prepend a `{ key: SERVER_PANE_KEY, label: t('desktop.settings.server.title'), icon: <Server />, render: () => <ServerPane /> }` entry to the existing personal-tokens section.
  - When runtime is anything else, sections stay exactly as they are today.
- [ ] Section uses `Server` icon from `lucide-react` (not `KeyRound`).
- [ ] Storybook for the dialog (if it exists) updated to include a `runtime=desktop` story; otherwise the existing `<ServerPane />` story from task 003 is the visual gate.
- [ ] `ui-validator` agent navigates to `/`, opens settings (via the user-profile menu), confirms the "Server" pane is visible (only because the validator runs in desktop runtime through `window.__GUEPARD_RUNTIME='desktop'`-style stubs), no console errors.

## Notes

- The `useRuntime()` helper from `@guepard/shell-runtime` (story 005) is the only gating source — never branch on `window.__TAURI__` directly.
- Spec anchor: `#75-presentation-appsweb` ("Settings dialog → 'Server' pane" bullet).
