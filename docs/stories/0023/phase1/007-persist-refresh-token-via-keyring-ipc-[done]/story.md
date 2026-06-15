---
spec: docs/specs/0023-auth-desktop-client-phase1.md
spec_sections:
  - "#74-server-appsserver"
  - "#33-user-flows-happy-paths"
status: done
started: 2026-04-20
finished: 2026-04-20
blocks: ["009"]
blocked_by: ["002", "004"]
---

# Persist refresh token via keyring IPC

## Goal

Wire `apps/server` (running as the desktop sidecar) to rehydrate sessions on boot from a keychain refresh token and to persist new refresh tokens via the keyring IPC after sign-in / sign-out.

## Scope

**In scope**
- Sidecar boot path: read `QLM_REFRESH_TOKEN` env var; if present, call Supabase refresh; on success, `keyringClient.set('refresh_token:' + QLM_SERVER_URL, newRefreshToken)` before serving the first request.
- Sidecar sign-in handler: after Supabase response, `keyringClient.set('refresh_token:' + QLM_SERVER_URL, refreshToken)`.
- Sidecar sign-out handler: after Supabase `signOut`, `keyringClient.delete('refresh_token:' + QLM_SERVER_URL)`.
- Tauri shell `lib.rs` change: read `refresh_token:<QLM_SERVER_URL>` from keychain at spawn time and pass as `QLM_REFRESH_TOKEN` env var to the sidecar.
- Refresh debouncing in the sidecar — single in-flight refresh per session (per spec §5.3).
- Sidecar startup retry budget on Supabase failure (3 attempts, exponential backoff) before serving without a refreshed session (webview lands on sign-in).

**Out of scope**
- First-run picker (story 008) — this story assumes `QLM_SERVER_URL` is already set.
- Server switcher pane / `restart_sidecar` (story 009).
- Cross-platform CI (story 010).

## Acceptance criteria

- [x] `pnpm --filter server test` covers the desktop-runtime startup branch (mock Supabase, mock keyringClient).
- [x] Manual: sign in, quit app, relaunch → land on home authenticated, no sign-in page seen.
- [x] Sign-out clears `refresh_token:*` from keychain (verify via `security find-generic-password`).
- [x] Expired refresh token at boot → sidecar removes the keyring entry and webview lands on sign-in (no infinite-refresh loop).
- [x] **Build + UI check:** desktop launches; sign-in screen renders; full sign-in / quit / relaunch / sign-out cycle completes without console errors.

## Tasks

1. [001 — Add desktop boot rehydrate](./001-add-desktop-boot-rehydrate-[done].md)
2. [002 — Add sidecar auth routes](./002-add-sidecar-auth-routes-[done].md)
3. [003 — Call rehydrate on server start](./003-call-rehydrate-on-server-start-[done].md)
4. [004 — Inject refresh token on spawn](./004-inject-refresh-token-on-spawn-[done].md)

## Demo / verification

```
pnpm --filter desktop tauri:dev
# Sign in with an existing Supabase test account.
# Quit the app, relaunch:
pnpm --filter desktop tauri:dev
# Lands on home, no sign-in screen.
# Sign out → relaunch → sign-in screen returns.
security find-generic-password -s run.qlm.desktop -a "refresh_token:https://api.qlm.com"
```

## Questions surfaced

- <bullet>

## Notes

- 002 — `/auth` routes are mounted only when `sidecarAuthSupabase` is provided to `createApp` — keeps the cloud server unchanged. Keyring writes are best-effort (logged + dropped on failure).
- 003 — `index.ts` awaits `rehydrateSession` before `Bun.serve` only when `desktopRuntime` is set; refresh adapter classifies Supabase error messages into `expired` vs `transient` for the retry/cleanup branches.
- 004 — Refresh-token keychain lookup happens *after* CONFIG_KEYS injection so it can namespace by the resolved `QLM_SERVER_URL`; absent / NoEntry collapse to one `desktop:refresh_token=missing` log line.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
