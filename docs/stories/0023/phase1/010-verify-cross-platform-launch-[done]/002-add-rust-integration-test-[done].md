---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - apps/desktop/src-tauri/tests/boot.rs
  - apps/desktop/src-tauri/Cargo.toml
  - apps/desktop/src-tauri/Cargo.lock
validation:
  kind: typecheck-only
---

# Add Rust integration test

Per spec §10.3: spawn the compiled sidecar binary against a `wiremock` Supabase stub, seed a temp keyring refresh token, assert the sidecar boots, refreshes, persists the new token via keyring IPC, and serves an authenticated `/health` 200.

## Done when

- [ ] `apps/desktop/src-tauri/Cargo.toml` adds dev-dependencies: `wiremock = "0.6"`, `tokio = { version = "1", features = ["full"] }`, `reqwest = { version = "0.12", features = ["json"] }`.
- [ ] `apps/desktop/src-tauri/tests/boot.rs` (new) exercises the full boot flow:
  1. Build the sidecar binary first (test emits a `println!("run `pnpm --filter server build:desktop` before `cargo test --test boot`")` fail-early if the binary is missing).
  2. Start a `wiremock::MockServer` responding to `POST /auth/v1/token?grant_type=refresh_token` with `{ access_token, refresh_token, expires_at }`.
  3. Start an in-process keyring-IPC HTTP stub (reuse `ipc::start` from `src/ipc.rs` with an `on_request` backed by `Arc<Mutex<HashMap<String,String>>>` pre-seeded with `refresh_token:<MOCK_SUPABASE_URL>`).
  4. `Command::new(".../binaries/api-server-<triple>")` with env: `QLM_RUNTIME=desktop`, `QLM_SERVER_URL=<mock-url>`, `QLM_REFRESH_TOKEN=seed-token`, `QLM_KEYRING_PORT`, `QLM_KEYRING_TOKEN`, `SERVER_PORT=<free-port>`, `HOSTNAME=127.0.0.1`.
  5. Poll `GET http://127.0.0.1:<port>/health` until 200 (timeout 15s).
  6. Assert `wiremock` saw the refresh request exactly once.
  7. Assert the keyring stub contains the **new** refresh token (key-rotated after refresh).
  8. `cmd.kill()` + `cmd.wait()` on teardown; no zombies.
- [ ] Test is `#[ignore]`-less — runs in the default `cargo test` invocation (CI will run it; the pre-step builds the sidecar).
- [ ] `cargo fmt --check` + `cargo clippy --tests --release -- -D warnings` + `pnpm typecheck` green.

## Notes

- The test is OS-agnostic but the sidecar binary's triple is not — CI provides the binary for its runner's triple. The test just picks `apps/desktop/src-tauri/binaries/api-server-<target_triple>` (use `env!("CARGO_CFG_TARGET_OS")` + `CARGO_CFG_TARGET_ARCH` to resolve).
- Don't seed the real OS keychain — the test runs the IPC server in-process so it's a pure HTTP round-trip.
- Spec anchor: `#103-integration-tests`.
