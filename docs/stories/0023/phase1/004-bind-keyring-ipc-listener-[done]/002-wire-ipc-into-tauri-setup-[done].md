---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/src-tauri/src/lib.rs
  - apps/desktop/src-tauri/src/ipc.rs
validation:
  kind: typecheck-only
---

# Wire IPC into Tauri setup

Start the keyring-IPC server during Tauri `.setup(...)`, generate the per-launch bearer token, and inject the resulting `GUEPARD_KEYRING_PORT` + `GUEPARD_KEYRING_TOKEN` env vars into the Bun sidecar spawn block.

## Done when

- [ ] `apps/desktop/src-tauri/src/lib.rs` declares `mod ipc;`.
- [ ] Inside the `.setup(...)` block, before the sidecar spawn:
  - Generate a 32-byte CSPRNG token via `rand::rngs::OsRng` (hex-encoded), stored in an `Arc<String>`.
  - Call `ipc::start(token.clone(), |op| { … })` where the closure dispatches to `keyring_cmds::keyring_entry(...)` for set/get/delete.
  - Capture the returned port; `append_log_line(&app_handle, &format!("desktop:ipc:bind port={port}"))` — token is never logged.
- [ ] The sidecar `Command::new(...).env(...)` chain is extended with `.env("GUEPARD_KEYRING_PORT", port.to_string())` and `.env("GUEPARD_KEYRING_TOKEN", token.as_str())`.
- [ ] `append_log_line` redacts both `GUEPARD_KEYRING_TOKEN` and any value following `Bearer ` so the token never surfaces in `desktop.log`.
- [ ] `cargo build` + `cargo clippy --release -- -D warnings` + `cargo fmt --check` green.

## Notes

- Token must outlive the IPC thread — wrap in `Arc<String>` and clone into the closure.
- Spec anchor: `#78-desktop-shell-appsdesktop` (the "Adds: keyring IPC bind + one-time token generation" line in the lib.rs item).
