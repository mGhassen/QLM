---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/src-tauri/Cargo.toml
  - apps/desktop/src-tauri/Cargo.lock
  - apps/desktop/src-tauri/src/ipc.rs
  - apps/desktop/src-tauri/src/lib.rs
validation:
  kind: typecheck-only
---

# Add IPC server module

Create a self-contained `ipc.rs` module that hosts the keyring-IPC HTTP server (bearer auth, rate cap, replay defence) and declare it in `lib.rs` so `cargo build` actually compiles it. Setup-block wiring + env injection land in task 002.

## Done when

- [ ] `apps/desktop/src-tauri/Cargo.toml` adds `tiny_http = "0.12"` and `rand = "0.8"` (or current stable). No removals.
- [ ] `apps/desktop/src-tauri/src/ipc.rs` exposes a `start(token: String, on_request: F) -> std::io::Result<u16>` that:
  - Binds `127.0.0.1:0` (random port) and returns the chosen port to the caller.
  - Spawns a worker thread serving the three endpoints: `POST /keyring/set` with JSON `{ key, value }`, `GET /keyring/get?key=…`, `DELETE /keyring/{key}`.
  - Validates `Authorization: Bearer <token>` using a constant-time comparison; missing or wrong token → `401`.
  - Enforces a 100 req/s rate cap per token (sliding-window or simple bucket); over-cap → `429`.
  - Drops requests with a `Date` header that skews >5s from system clock → `400`.
  - Delegates the keyring operations to `on_request` (a closure receiving an enum `IpcOp::{Set, Get, Delete}` and returning `Result<Option<String>, String>`), so the test suite can stub it without touching the real keychain.
- [ ] All log lines emitted from this module follow the `desktop:ipc:<verb> key=<k> status=<ok|err>` shape — never log the token, never log the value.
- [ ] `cargo build` + `cargo clippy --release -- -D warnings` + `cargo fmt --check` green.

## Notes

- Keep the module fully decoupled from `keyring_cmds` — wiring lands in task 002.
- `tiny_http` keeps the dep footprint small vs `hyper`; the spec lists either.
- Spec anchor: `#78-desktop-shell-appsdesktop` (file-by-file work item for `src-tauri/src/ipc.rs`).
