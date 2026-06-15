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

# Inject MANAGED_KEYS into sidecar spawn

Replace the `TODO(story-003)` seam in the sidecar-spawn block with a loop that reads each `MANAGED_KEYS` entry from the OS keychain and injects it as an env var into the spawned `apps/server` Bun sidecar.

## Done when

- [ ] `apps/desktop/src-tauri/src/lib.rs` (inside the `.setup(...)` block, after the env-subset / OS handling and before the final `cmd = cmd.env(...)` chain) loops over `keys::MANAGED_KEYS`:
  ```rust
  for key in keys::MANAGED_KEYS {
      match keyring_cmds::keyring_entry(key) {
          Ok(entry) => match entry.get_password() {
              Ok(value) if !value.is_empty() => {
                  append_log_line(&app_handle, &format!("desktop:keyring {key}=set"));
                  cmd = cmd.env(*key, value);
              }
              Ok(_) => append_log_line(&app_handle, &format!("desktop:keyring {key}=empty")),
              Err(keyring::Error::NoEntry) =>
                  append_log_line(&app_handle, &format!("desktop:keyring {key}=missing")),
              Err(e) =>
                  append_log_line(&app_handle, &format!("desktop:keyring {key}=error:{e}")),
          },
          Err(e) => append_log_line(&app_handle, &format!("desktop:keyring {key}=error:{e}")),
      }
  }
  ```
  (Lifted verbatim from qwery-core's spawn block.)
- [ ] **Values are never logged** — only `=set` / `=empty` / `=missing` / `=error:<errcode>`.
- [ ] After the loop, also read `app_config_dir/config.json` and inject any `CONFIG_KEYS` values it holds (mirror qwery-core's pattern).
- [ ] The `// TODO(story-003)` comment is removed; `// TODO(story-004)` and `// TODO(story-007)` remain as seam markers for the keyring-IPC env vars and refresh-token injection respectively.
- [ ] `cargo build` + `cargo clippy --release -- -D warnings` + `cargo fmt --check` green.

## Notes

- Spec anchor: `#78-desktop-shell-appsdesktop`, `#33-user-flows-happy-paths` (env injection at sidecar spawn).
- Reference: `qwery-core/apps/desktop/src-tauri/src/lib.rs` lines 443–479 (the `for key in MANAGED_KEYS` block + the `if let Ok(dir) = app.path().app_config_dir()` config block immediately below it).
