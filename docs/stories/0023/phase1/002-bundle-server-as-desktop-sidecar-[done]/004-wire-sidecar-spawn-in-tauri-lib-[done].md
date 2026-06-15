---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/src-tauri/src/lib.rs
validation:
  kind: typecheck-only
---

# Wire sidecar spawn in Tauri lib.rs

Replace the `TODO(story-002)` placeholder in `apps/desktop/src-tauri/src/lib.rs` with the sidecar spawn block lifted from qwery-core: pick a port, spawn the `api-server` sidecar with the right env, wait for it to become ready on TCP, inject `window.__GUEPARD_API_URL`, forward stdout/stderr to `desktop.log`, and kill the child on window-close / before-quit.

## Done when

- [ ] Inside the Tauri `.setup(...)` block:
  - `pick_port(4096)` is called to find a free port.
  - The sidecar binary is resolved to `apps/desktop/src-tauri/binaries/api-server-<triple>[.exe]` in debug, and next to the app executable in release (matching qwery-core's path logic).
  - Spawn via `tauri_plugin_shell::ShellExt` `sidecar("api-server")` with env:
    - `GUEPARD_RUNTIME=desktop`
    - `GUEPARD_STORAGE_DIR=<homedir>/.guepard/storage`
    - `HOSTNAME=127.0.0.1`
    - `SERVER_PORT=<picked port>` (mirrors the `SERVER_PORT` convention used by `apps/server/src/index.ts`).
    - Windows: keep the qwery-core env-subset workaround + `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0`.
    - Non-Windows: inherit `std::env::vars_os()` like qwery-core does.
  - PID is written via the existing `write_api_server_pid` helper.
  - `window.__GUEPARD_API_URL = "http://127.0.0.1:<port>"` is injected into the webview via `window.eval(js)`.
  - A `tokio`/`tauri::async_runtime::spawn` task polls `127.0.0.1:<port>` via `TcpStream::connect_timeout` with the 30-attempt / 200ms-interval loop from qwery-core until the sidecar is ready.
  - Stdout/stderr from the sidecar are forwarded to `append_log_line` as `bun:stdout <line>` / `bun:stderr <line>`.
  - `on_window_event(CloseRequested)` kills the child and removes the PID file (replaces the current bare PID-removal block).
  - `before-quit` path likewise kills the child.
- [ ] `cd apps/desktop/src-tauri && cargo build` succeeds.
- [ ] `cargo clippy -- -D warnings` passes.
- [ ] `cargo fmt --check` passes.
- [ ] No `TODO(story-002)` comment remains in `lib.rs`.
- [ ] `MANAGED_KEYS` env injection and keyring-IPC env vars (`GUEPARD_KEYRING_PORT`, `GUEPARD_KEYRING_TOKEN`, `GUEPARD_REFRESH_TOKEN`) are **not** wired here — those land in stories 003, 004, and 007. Leave clean `// TODO(story-003 / story-004 / story-007)` seam comments where they'll plug in.

## Notes

- Spec anchor: `#78-desktop-shell-appsdesktop`, `#33-user-flows-happy-paths`.
- Reference: `/Users/hani.chalouati/Documents/work/guepard/qwery-core/apps/desktop/src-tauri/src/lib.rs` `.setup(...)` block.
