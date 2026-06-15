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

# Register Tauri commands in invoke_handler

Wire the 6 new commands (`save_api_key`, `get_api_key`, `delete_api_key`, `debug_keyring_status`, `get_app_config`, `set_app_config`) into Tauri's `invoke_handler!` macro so the renderer can call them via `window.__TAURI__.core.invoke(...)`.

## Done when

- [ ] `apps/desktop/src-tauri/src/lib.rs` `tauri::Builder::default()` chain adds an `.invoke_handler(tauri::generate_handler![...])` call listing all 6 commands. Imports look like `use crate::keyring_cmds::{save_api_key, get_api_key, delete_api_key, debug_keyring_status};` + `use crate::config_cmds::{get_app_config, set_app_config};`.
- [ ] `cargo build` succeeds — the macro expansion type-checks against the function signatures.
- [ ] `cargo clippy --release -- -D warnings` + `cargo fmt --check` green.
- [ ] No new Tauri capability change required — `invoke_handler` commands don't need a permission entry. (Plugin commands like `shell:allow-execute` do; ours are first-party `#[tauri::command]` functions.)

## Notes

- Spec anchor: `#78-desktop-shell-appsdesktop`, `#52-endpoints` (Tauri command rows).
- The renderer-side `useRuntime` wrappers that call these commands land in story 005 (`expose-runtime-helper-in-shell-runtime`).
