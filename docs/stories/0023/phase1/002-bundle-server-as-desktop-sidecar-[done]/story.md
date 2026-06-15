---
spec: docs/specs/0023-auth-desktop-client-phase1.md
spec_sections:
  - "#74-server-appsserver"
  - "#12-implementation-sequencing"
status: done
started: 2026-04-19
finished: 2026-04-19
blocks: ["007"]
blocked_by: ["001"]
---

# Bundle server as desktop sidecar

## Goal

Compile `apps/server` into a per-triple standalone binary that the Tauri shell spawns as a sidecar so the renderer can talk to a local `127.0.0.1:<port>` API.

## Scope

**In scope**
- `apps/server/package.json` script `build:desktop` invoking `bun build --compile --target=bun-<triple>` and writing the output to `apps/desktop/src-tauri/binaries/api-server-<triple>[.exe]` for the host triple. (Cross-compile matrix is story 010 work.)
- `apps/server` startup change: read `QLM_RUNTIME` env var. When `desktop`, bind `127.0.0.1` only (never `0.0.0.0`); read `QLM_STORAGE_DIR` (default `~/.qlm/storage/`) and use it for any local SQLite app-state path.
- `apps/desktop/src-tauri/tauri.conf.json` `bundle.externalBin` updated to point at `binaries/api-server` per triple.
- Tauri `lib.rs` sidecar block reads `QLM_STORAGE_DIR` from the host home dir and passes it through.
- `apps/desktop/package.json` `tauri:dev` runs `pnpm --filter server build:desktop` first.

**Out of scope**
- Refresh-token rehydration (story 007).
- Keyring IPC env wiring (story 004 binds the listener; this story just ensures the env vars flow from Tauri to sidecar).
- Cross-platform CI matrix (story 010).

## Acceptance criteria

- [x] `pnpm --filter server build:desktop` produces `apps/desktop/src-tauri/binaries/api-server-<triple>[.exe]` (or `.exe` on Windows). Verified — 75 MB Mach-O arm64 at `binaries/api-server-aarch64-apple-darwin`.
- [x] `pnpm --filter desktop tauri:dev` launches the Tauri shell, sidecar comes ready on a `127.0.0.1:<port>`, webview loads it via `window.__QLM_API_URL` injection. (Note: `/internal/health` endpoint is not added in this story — Tauri-side TCP probe gates readiness instead. Manual user verification confirmed.)
- [x] **Build + UI check:** packaged window renders the existing `apps/server`-served `apps/web` shell. Confirmed by user manually running the rebuilt `.app`.
- [x] PID file at `app_config_dir/api-server.pid` is created on launch and deleted on clean quit; relaunch kills any stale PID.
- [x] `pnpm typecheck` stays green (51/51); sidecar's hostname is forced to `127.0.0.1` whenever `QLM_RUNTIME=desktop` (covered by `apps/server/__tests__/desktop-runtime.test.ts`, 8/8 pass).

## Tasks

1. [001-add-server-build-desktop-script](001-add-server-build-desktop-script-[done].md)
2. [002-gate-server-on-qlm-runtime-env](002-gate-server-on-qlm-runtime-env-[done].md)
3. [003-register-sidecar-in-tauri-config](003-register-sidecar-in-tauri-config-[done].md)
4. [004-wire-sidecar-spawn-in-tauri-lib](004-wire-sidecar-spawn-in-tauri-lib-[done].md)
5. [005-chain-build-desktop-into-tauri-dev](005-chain-build-desktop-into-tauri-dev-[done].md)

## Demo / verification

```
pnpm --filter server build:desktop
pnpm --filter desktop tauri:dev
```

Observe: window opens; `desktop.log` shows `bun:stdout` lines from the sidecar startup; webview loads the home page; quitting the window kills the sidecar and removes the PID file.

## Questions surfaced

- <bullet>

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
