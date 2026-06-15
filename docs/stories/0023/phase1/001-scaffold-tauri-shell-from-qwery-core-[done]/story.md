---
spec: docs/specs/0023-auth-desktop-client-phase1.md
spec_sections:
  - "#78-desktop-shell-appsdesktop"
  - "#12-implementation-sequencing"
status: done
started: 2026-04-18
finished: 2026-04-19
blocks: ["002", "003"]
blocked_by: []
---

# Scaffold Tauri shell from qwery-core

## Goal

Stand up the Tauri 2 desktop shell at `apps/desktop/src-tauri/` by lifting `qwery-core/apps/desktop/src-tauri/lib.rs` so a packaged window opens and is ready to host a sidecar.

## Scope

**In scope**
- New `apps/desktop/src-tauri/Cargo.toml` mirroring qwery-core's deps (`tauri = "2"`, `tauri-plugin-shell = "2"`, `tauri-plugin-opener = "2"`, `tauri-plugin-os = "2"`, `tauri-plugin-dialog = "2"`, `keyring = "3"` with native features, `serde`, `serde_json`, `dotenvy`).
- `apps/desktop/src-tauri/tauri.conf.json` with **no `frontendDist`** (sidecar will inject `window.__QLM_API_URL`); app identifier `run.qlm.desktop`; `bundle.externalBin` placeholder ready for the api-server binary.
- `apps/desktop/src-tauri/capabilities/default.json` with shell-sidecar / opener / dialog grants only.
- `apps/desktop/src-tauri/src/lib.rs` lifted from qwery-core (`target_triple`, `configure_webview_zoom`, `pick_port(4096)`, PID file path helper, `kill_previous_api_server`, Windows env-subset constants, `append_log_line`, server-ready TCP loop, child kill on window close + `before-quit`). Renamed `SERVICE_NAME` to `"run.qlm.desktop"`.
- Deletion of the stale Electron scaffold: `apps/desktop/electron/` directory, `electron-builder.yml`, electron-related `package.json` deps and scripts.
- `apps/desktop/package.json` scripts `tauri:dev` / `tauri:build` (sidecar binary placeholder at this stage — story 002 wires the real one).

**Out of scope**
- Bundling `apps/server` into a sidecar binary (story 002).
- Keyring Tauri commands (story 003).
- Keyring-IPC HTTP listener (story 004).
- Any `apps/web` desktop-only routes.

## Acceptance criteria

- [x] `cargo build --manifest-path apps/desktop/src-tauri/Cargo.toml` succeeds on the dev host triple.
- [x] `pnpm typecheck` stays green across the monorepo.
- [x] `pnpm --filter desktop tauri:dev` opens a window (sidecar binary may be a stub at this stage; window may show a placeholder page).
- [x] No file remains under `apps/desktop/electron/` and no electron deps in `apps/desktop/package.json`. (No electron scaffold ever existed in this repo — task 001 skipped.)
- [x] `desktop.log` appears under `app_config_dir` after a launch.

## Tasks

1. [001-purge-electron-scaffold](001-purge-electron-scaffold-[skipped].md)
2. [002-add-tauri-cargo-manifest-and-config](002-add-tauri-cargo-manifest-and-config-[done].md)
3. [003-lift-tauri-lib-rs-from-qwery-core](003-lift-tauri-lib-rs-from-qwery-core-[done].md)
4. [004-wire-tauri-package-json-scripts](004-wire-tauri-package-json-scripts-[done].md)
5. [005-smoke-launch-tauri-window](005-smoke-launch-tauri-window-[done].md)
6. [006-wrap-client-only-spa](006-wrap-client-only-spa-[done].md)

## Demo / verification

```
pnpm install
pnpm --filter desktop tauri:dev
```

Observe: a Tauri window opens, `desktop.log` is written to `app_config_dir` (`~/Library/Application Support/run.qlm.desktop/desktop.log` on macOS), the window closes cleanly, and the PID file at `<app_config_dir>/api-server.pid` is removed on quit.

## Questions surfaced

- <bullet, only when something unexpected came up during implementation>

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped — **no, two deviations logged in spec Changelog**:
  1. `apps/desktop/src-tauri/tauri.conf.json` ships with `frontendDist: "../dist"`, not "no frontendDist" as the spec text said. Needed for the packaged `.app` to render a shell pre-sidecar; mirrors qwery-core, which uses both `frontendDist` (static UI) AND sidecar URL injection at runtime.
  2. Added task 006 (`wrap-client-only-spa`) because `apps/web` is TanStack Start (SSR) and can't be served as a static `frontendDist`. Desktop now ships a thin client-only TanStack Router SPA inside `apps/desktop/src/`, mirroring qwery-core's pattern. Vite alias `@/` → `apps/web/src` is wired so future stories can pull shared route components without copy-paste.
