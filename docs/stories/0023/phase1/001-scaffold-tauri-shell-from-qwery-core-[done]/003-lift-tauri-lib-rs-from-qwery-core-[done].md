---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/src-tauri/src/lib.rs
  - apps/desktop/src-tauri/src/main.rs
validation:
  kind: typecheck-only
---

# Lift Tauri lib.rs from qwery-core

Port the Rust shell entry point from qwery-core so the window opens with the lifecycle helpers (port pick, PID file, kill-previous, server-ready loop, window event handlers, log helper) needed by later stories. Keyring commands and the keyring-IPC HTTP server are out of scope here — they land in stories 003 and 004 respectively.

## Done when

- [ ] `apps/desktop/src-tauri/src/main.rs` is a one-line shim calling `desktop_lib::run()`.
- [ ] `apps/desktop/src-tauri/src/lib.rs` ports the following symbols from `qwery-core/apps/desktop/src-tauri/src/lib.rs`, with `SERVICE_NAME = "run.guepard.desktop"`:
  - `target_triple()`
  - `configure_webview_zoom()` (Windows-only; no-op elsewhere)
  - `pick_port(preferred: u16) -> u16` with random-fallback
  - `pid_file_path(app: &AppHandle) -> Option<PathBuf>` (`<app_config_dir>/api-server.pid`)
  - `kill_pid_best_effort(pid: u32)` cross-platform
  - `kill_previous_api_server(app: &AppHandle)`
  - `write_api_server_pid(app: &AppHandle, pid: u32)`
  - `log_path(app: &AppHandle)` + `append_log_line(app: &AppHandle, line: &str)`
  - Windows env-subset constants and `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0` workaround.
  - Server-ready TCP loop pattern (function or closure — actual sidecar spawn lands in story 002).
  - Child-kill on `WindowEvent::CloseRequested` and `app.on_window_event` plumbing; `before-quit` handler.
  - `pub fn run()` entry that initialises Tauri with the plugins from `Cargo.toml` and registers an empty `invoke_handler` (filled in stories 003 / 004 / 009).
- [ ] No keyring `Entry` calls and no `MANAGED_KEYS` constant in this file (lifting these is task 003 of story 003).
- [ ] No keyring-IPC HTTP server (story 004).
- [ ] `cd apps/desktop/src-tauri && cargo build` succeeds (sidecar binary may be absent — server-ready loop is dormant until story 002 wires the sidecar spawn).
- [ ] `cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml -- -D warnings` passes.
- [ ] `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --check` passes.

## Notes

- Spec anchor: `#78-desktop-shell-appsdesktop` lists exactly which qwery-core symbols to lift.
- Comment any `TODO(story-002)` markers where the sidecar spawn block will land — keep them tight (one line each).
