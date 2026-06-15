---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/src-tauri/src/config_cmds.rs
  - apps/desktop/src-tauri/src/lib.rs
validation:
  kind: typecheck-only
---

# Add config_cmds module

Add `get_app_config` / `set_app_config` Tauri commands that read/write the JSON file at `app_config_dir/config.json`.

## Done when

- [ ] New `apps/desktop/src-tauri/src/config_cmds.rs` exposes:
  - `config_path(app: &AppHandle) -> Result<PathBuf, String>` — `<app_config_dir>/config.json`. Returns `String` error on `app_config_dir` failure.
  - `#[tauri::command] get_app_config(app) -> Result<HashMap<String, String>, String>` — returns `{}` when the file is missing; deserialises with `serde_json::from_str`, falling back to `{}` if the JSON fails to parse (matches qwery-core's tolerance to user-corrupted config).
  - `#[tauri::command] set_app_config(app, config: HashMap<String, String>) -> Result<(), String>` — creates the parent dir via `fs::create_dir_all`, writes a pretty-printed JSON file. Replaces the file atomically is **not** required in phase 1 (qwery-core doesn't do it either; revisit if customers report partial writes).
- [ ] `lib.rs` declares `mod config_cmds;`.
- [ ] `cargo build` + `cargo clippy --release -- -D warnings` + `cargo fmt --check` all green.
- [ ] `set_app_config` does **not** validate keys against `CONFIG_KEYS` — it accepts any KV pair, since spec §6.2 lists the JSON shape as open-ended (`{ serverUrl: string; enforceEnterprise?: boolean; ... }`). Validation happens at the consumer side.

## Notes

- Spec anchor: `#78-desktop-shell-appsdesktop`, `#62-config-payload-contracts`.
- Reference: `qwery-core/apps/desktop/src-tauri/src/lib.rs` lines 283–309 (verbatim lift, only renaming the module).
- Wiring into `invoke_handler!` macro is task 004.
