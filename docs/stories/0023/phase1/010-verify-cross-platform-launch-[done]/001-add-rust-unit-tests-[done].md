---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - apps/desktop/src-tauri/src/config_cmds.rs
  - apps/desktop/src-tauri/src/lib.rs
validation:
  kind: typecheck-only
---

# Add Rust unit tests

Cover the spec §10.2 Rust unit-test matrix that isn't already shipped. IPC bearer / rate-cap / Date-skew tests are already in `ipc.rs` (story 004) — do not duplicate. `keyring_cmds` direct tests are out of scope: `keyring::Entry` is a concrete third-party type that can't be trait-shimmed without a heavy refactor, and the `keyring` crate's `mock` feature isn't enabled in our Cargo.toml — the IPC test from 004 exercises the keyring path indirectly via the injected `on_request` closure.

## Done when

- [ ] `apps/desktop/src-tauri/src/config_cmds.rs` gains a `#[cfg(test)] mod tests` covering the `serde_json` shape used by `get_app_config` / `set_app_config`: valid `HashMap<String, String>` → `to_string_pretty` → `from_str` → equal; malformed JSON returns `Err`; object with non-string value (e.g. number) deserialises as `Err` (preserving the strict shape); empty object round-trips.
- [ ] `apps/desktop/src-tauri/src/lib.rs` gains `#[cfg(test)] mod tests` covering:
  - `pick_port(preferred)`: picks `preferred` when free; returns a **different** port when `preferred` is already held by a test-opened `TcpListener` (don't hard-code `4096` — pick an unlikely high port so the test stays hermetic).
  - `MANAGED_KEYS` ordering: two iterations produce the same `Vec<&str>` and the first / last element match the source order — regression guard against someone switching to a `HashSet`.
- [ ] `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml` green.
- [ ] `cargo clippy --release --tests -- -D warnings` + `cargo fmt --check` + `pnpm typecheck` green.

## Notes

- Scope hygiene: **do not** re-test what `ipc.rs` already covers (rate cap, Date skew, bearer auth).
- Keyring CRUD direct tests deferred — see task frontmatter preamble.
- Spec anchor: `#102-unit-tests`.
