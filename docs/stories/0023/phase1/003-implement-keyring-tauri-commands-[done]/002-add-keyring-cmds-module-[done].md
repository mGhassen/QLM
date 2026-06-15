---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/src-tauri/src/keyring_cmds.rs
  - apps/desktop/src-tauri/src/lib.rs
validation:
  kind: typecheck-only
---

# Add keyring_cmds module

Lift qwery-core's keyring Tauri commands into a new `keyring_cmds.rs` module with `SERVICE_NAME = "run.guepard.desktop"`.

## Done when

- [ ] New `apps/desktop/src-tauri/src/keyring_cmds.rs` exposes:
  - `keyring_entry(key: &str) -> Result<keyring::Entry, String>` — encapsulates the Windows `Entry::new_with_target("{SERVICE_NAME}/{key}", SERVICE_NAME, "desktop")` workaround vs the simpler `Entry::new(SERVICE_NAME, key)` used everywhere else. Lifted verbatim from qwery-core.
  - Windows-only `keyring_entry_legacy(key: &str)` and `keyring_entry_legacy_shared_target(key: &str)` for legacy-target read/migrate/delete (lifted verbatim).
  - `#[tauri::command] save_api_key(app, key, value) -> Result<(), String>` — set + verify (catches keyring-backend failure modes early). Logs `desktop:save_api_key key=… status=ok|error|verify_*` via `crate::log::append_log_line` (no value, only `value_len` if anything).
  - `#[tauri::command] get_api_key(app, key) -> Result<Option<String>, String>` — `Ok(Some(v))` on hit, `Ok(None)` on `NoEntry`. On Windows, includes the legacy-fallback + auto-migrate path from qwery-core.
  - `#[tauri::command] delete_api_key(app, key) -> Result<(), String>` — `NoEntry` is a successful no-op. On Windows, also deletes both legacy entries.
  - `#[tauri::command] debug_keyring_status() -> HashMap<String, String>` — returns a `key -> status` map (`set` / `empty` / `missing` / `error:…`) for every entry in `MANAGED_KEYS`.
- [ ] `lib.rs` declares `mod keyring_cmds;`. The existing `pub const SERVICE_NAME` stays in `lib.rs`; `keyring_cmds.rs` reads `crate::SERVICE_NAME`.
- [ ] `cargo build` + `cargo clippy --release -- -D warnings` + `cargo fmt --check` all green.

## Notes

- Spec anchor: `#78-desktop-shell-appsdesktop`, `#63-secrets-contract`.
- Reference: `qwery-core/apps/desktop/src-tauri/src/lib.rs` lines 39–208 (verbatim lift, only changing the SERVICE_NAME and module organisation).
- Wiring into Tauri's `invoke_handler!` macro is task 004, not here.
