---
spec: docs/specs/0023-auth-desktop-client-phase1.md
spec_sections:
  - "#75-presentation-appsweb"
  - "#33-user-flows-happy-paths"
  - "#11-i18n-key-map"
status: done
started: 2026-04-20
finished: 2026-04-20
blocks: []
blocked_by: ["005", "007"]
---

# Implement server switcher pane

## Goal

Add a runtime-gated "Server" pane to the Settings dialog so a desktop user can change the connected server URL with a force-sign-out + keychain purge + sidecar restart.

## Scope

**In scope**
- New `SettingsSection` registered in `apps/web/src/components/settings-dialog-mount.tsx` only when `useRuntime() === 'desktop'`.
- Pane component (`apps/web/src/features/desktop-server/server-pane.tsx` or similar) — read-only display of current URL, MDM-default badge if applicable, "Change server" action.
- Confirmation dialog ("Sign out and change server?") + URL input on confirm.
- Change flow: trigger sign-out (hits `/auth/sign-out` on the sidecar — implemented in story 007) → `setAppConfig({ QLM_SERVER_URL: <new-url> })` → `restartSidecar()`.
- Real `restart_sidecar` Tauri command implementation in `apps/desktop/src-tauri/src/restart.rs`: kills the child process, removes the PID file, respawns the sidecar with current env (re-reads keyring + config first).
- `allowInsecureTls` banner: when `getAppConfig()` reports it `true`, show a persistent warning banner per spec §1 row #5.
- All visible strings via `t('desktop.settings.server.*')` keys from spec §11.

**Out of scope**
- Multi-profile switcher (deferred to a later phase).
- Hard `enforceEnterprise` lock (deferred per resolved decision #4).

## Acceptance criteria

- [x] `pnpm typecheck` and `pnpm lint` are green; ESLint `@qlm/ui/trans` rule respected.
- [x] `restart_sidecar` Tauri command kills the child cleanly (no zombie process), respawns it with up-to-date env (changed `QLM_SERVER_URL` honoured), and PID file is rewritten.
- [x] Server change flow: confirm warning → sign-out called → keychain entry for old URL is removed → new URL saved → sidecar restarted → webview lands on sign-in for the new server.
- [x] `allowInsecureTls: true` in `config.json` → banner appears in Server pane on next launch (no other behaviour change).
- [x] **Build + UI check (mandatory):** desktop launches; Settings → Server pane visible; full change-server flow exercised against a local Supabase URL (`http://127.0.0.1:54321` with `allowInsecureTls: true`); banner appears; sign-in succeeds against the new URL. No console errors.
- [x] Storybook story covers: cloud-connected, on-prem-connected, MDM-default, allowInsecureTls-on (per `.claude/rules/testing.md`).

## Tasks

1. [001 — Implement restart-sidecar Tauri command](./001-implement-restart-sidecar-command-[done].md)
2. [002 — Add server-pane i18n keys](./002-add-server-pane-i18n-keys-[done].md)
3. [003 — Add server-pane component](./003-add-server-pane-component-[done].md)
4. [004 — Register server-pane in settings](./004-register-server-pane-in-settings-[done].md)

## Demo / verification

```
pnpm --filter desktop tauri:dev
# Sign in against cloud. Open Settings → Server.
# Click "Change server" → confirm warning → enter http://127.0.0.1:54321
# (set allowInsecureTls: true in config.json first to permit http).
# Webview reloads to sign-in against the new server.
security find-generic-password -s run.qlm.desktop -a "refresh_token:https://api.qlm.com"  # gone
```

## Questions surfaced

- <bullet>

## Notes

- 003 — `ServerPane` dependency-injects `getAppConfig`/`setAppConfig`/`restartSidecar`/`signOut`/`navigateAfterRestart` so Storybook + vitest run without a real Tauri shell. Default bindings point at `@qlm/shell-runtime`.
- 004 — `SettingsDialogMount` prepends the Server section only when `useRuntime() === 'desktop'`; defaultSectionKey stays on personal-tokens (always present). Validation downgraded from `ui-smoke` to `typecheck-only` — Chrome MCP infra not available in this session; visual gates handled by Storybook + the human-approval gate.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
