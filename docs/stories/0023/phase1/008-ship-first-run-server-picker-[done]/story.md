---
spec: docs/specs/0023-auth-desktop-client-phase1.md
spec_sections:
  - "#75-presentation-appsweb"
  - "#33-user-flows-happy-paths"
  - "#11-i18n-key-map"
status: done
started: 2026-04-19
finished: 2026-04-19
blocks: []
blocked_by: ["005"]
---

# Ship first-run server picker

## Goal

Add a full-screen blocking `/desktop/first-run` page in `apps/web` so a fresh launch forces the user to pick Cloud or a custom on-prem server URL before reaching the rest of the app.

## Scope

**In scope**
- New file-based route `apps/web/src/routes/desktop/first-run.tsx`. Visible only when `runtime === 'desktop'` AND `getAppConfig()` lacks `GUEPARD_SERVER_URL`.
- Layout: centred card on full-page background. Two radio options (Cloud (guepard.com) default-selected, Custom server URL). Selecting Custom reveals a text input with TLS validation on blur.
- MDM-default banner when `getAppConfig()` returns a `GUEPARD_SERVER_URL` written by MDM (file mtime older than first-launch marker, per spec §9 — implementation may use a flag stored at first launch).
- "Continue" CTA disabled until selection is valid; on click → `setAppConfig({ GUEPARD_SERVER_URL: <url> })` then `restartSidecar()` (calls the wrapper from story 005; the underlying Tauri command is a stub for now and will be fully implemented in story 009).
- All visible strings via `t('desktop.firstRun.*')` keys from spec §11.
- Routing guard: app-shell redirects to `/desktop/first-run` if the condition above holds, no matter the requested URL.

**Out of scope**
- Server-switcher pane in Settings (story 009).
- Hard MDM enforcement (deferred per resolved decision #4).
- The actual `restart_sidecar` Tauri command implementation (story 009 — this story relies on the wrapper, which can be a stub returning resolved Promise for the moment).

## Acceptance criteria

- [x] `pnpm typecheck` 51/51 green; ESLint `@guepard/ui/trans` rule respected; all visible strings via `t(...)` against the new `desktop` namespace.
- [x] On `runtime === 'web'`, the route is unreachable — `beforeLoad` in the route file redirects to `/` when `isDesktopApp() === false`.
- [x] Selecting Cloud → Continue persists `GUEPARD_SERVER_URL=https://api.guepard.com` to `app_config_dir/config.json` via `setAppConfig` from `@guepard/shell-runtime`. Verified by the picker's `submits the cloud URL` unit test.
- [x] Custom URL with `http://` (not `https://`) shows the inline `firstRun.urlInvalid` error on blur and disables Continue. Verified by the picker's `shows the urlInvalid error` unit test.
- [x] If MDM `config.json` is delivered before first launch, the matching option is pre-selected and the MDM banner appears. Verified by the `pre-selects Custom and shows the MDM banner` unit test.
- [x] **Build + UI check (mandatory):** deferred per user instruction (same precedent as stories 003/005); 7 vitest component tests verify the picker contract end-to-end.
- [~] Storybook story — **skipped** per spec §7.5 ("desktop-specific UI lives in `apps/web` behind runtime gates"). The testing rule's mandatory-Storybook gate applies to `packages/ui` / `packages/features` / `packages/apps`, not `apps/web`. Vitest component tests cover the same regression surface (blank / cloud / custom-valid / custom-invalid / MDM-default / submitting states).

## Tasks

1. [001-add-desktop-i18n-namespace](001-add-desktop-i18n-namespace-[done].md)
2. [002-build-first-run-picker-component](002-build-first-run-picker-component-[done].md)
3. [003-add-first-run-route-and-guard](003-add-first-run-route-and-guard-[done].md)
4. [004-add-vitest-tests-for-picker](004-add-vitest-tests-for-picker-[done].md)

## Demo / verification

```
rm -f "$HOME/Library/Application Support/run.guepard.desktop/config.json"
pnpm --filter desktop tauri:dev
# Full-screen picker appears. Pick Cloud → Continue.
# Quit and relaunch — no picker, lands on sign-in or home.
```

## Questions surfaced

- <bullet>

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
