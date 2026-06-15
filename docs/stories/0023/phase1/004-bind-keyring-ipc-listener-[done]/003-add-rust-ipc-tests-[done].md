---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - apps/desktop/src-tauri/src/ipc.rs
validation:
  kind: typecheck-only
---

# Add Rust IPC tests

Cover `ipc::start` with the four invariants the spec calls out — bearer-token round-trip, set/get/delete happy path, rate cap, and `Date`-skew replay defence — using an in-process `tiny_http` client and a stubbed `on_request` closure.

## Done when

- [ ] Inside `apps/desktop/src-tauri/src/ipc.rs`, a `#[cfg(test)] mod tests` module contains:
  - `bearer_correct_returns_2xx` — POST `/keyring/set` with the right `Authorization: Bearer <token>` and a stubbed `on_request` returns `204`.
  - `bearer_wrong_returns_401` — same request with a wrong token returns `401`.
  - `bearer_missing_returns_401` — same request with no Authorization header returns `401`.
  - `crud_round_trip` — set `key=test value=x`, get `key=test` returns `{"value":"x"}`, delete `key=test` returns `204`. Stub uses an `Arc<Mutex<HashMap<String,String>>>`.
  - `rate_cap_returns_429` — fire 101 requests inside one second with the same valid token; the 101st must come back `429`.
  - `stale_date_returns_400` — set the `Date` header to `now() - 10s`; response is `400`.
- [ ] Tests bind a fresh `127.0.0.1:0` per test (don't reuse ports across tests).
- [ ] `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml` is green.

## Notes

- Use `std::net::TcpStream` + raw HTTP for the wrong-bearer / missing-bearer cases — `reqwest` would be overkill.
- Spec anchor: `#102-unit-tests` (Rust unit-tests bullet — IPC token-auth round-trip).
