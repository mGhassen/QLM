---
spec: docs/specs/0023-auth-desktop-client-phase1.md
spec_sections:
  - "#78-desktop-shell-appsdesktop"
  - "#52-endpoints"
  - "#74-server-appsserver"
status: done
started: 2026-04-19
finished: 2026-04-20
blocks: ["007"]
blocked_by: ["003"]
---

# Bind keyring-IPC listener

## Goal

Bind a per-launch HTTP keyring-IPC listener in the Rust shell so the Bun sidecar can read/write the OS keychain at boot time without going through the renderer.

## Scope

**In scope**
- New `apps/desktop/src-tauri/src/ipc.rs` HTTP server (small crate: `tiny_http` or `hyper`) bound on a random `127.0.0.1:<port>` at app start.
- Endpoints `POST /keyring/set` (`{ key, value }`), `GET /keyring/get?key=…`, `DELETE /keyring/{key}`.
- Bearer-token auth: `Authorization: Bearer <GUEPARD_KEYRING_TOKEN>`. Token generated once per launch via `rand`. 401 on missing/wrong token.
- Rate cap (100 req/s per token) + clock-skew guard (drop `Date` headers >5s skew).
- Pass `GUEPARD_KEYRING_PORT` and `GUEPARD_KEYRING_TOKEN` to the sidecar at spawn (extends `lib.rs` env block).
- `apps/server` `keyringClient` module (`set` / `get` / `delete`) reading those env vars and calling the IPC. Used in subsequent stories.
- Sanity logging via `append_log_line` — never log the token or values.

**Out of scope**
- Sidecar consumers (story 007 wires the auth flow).
- Renderer-driven Tauri keyring commands (covered by story 003).
- IPC integrity verification beyond bearer auth (no MAC, no per-request signature in phase 1 — `127.0.0.1` binding + token check is the security boundary).

## Acceptance criteria

- [x] `cargo test` covers the IPC token-auth round-trip (correct token → 200, wrong token → 401, missing token → 401), set/get/delete happy paths, rate-cap behaviour.
- [x] On launch, sidecar can call `POST /keyring/set { key: 'test', value: 'x' }` → `GET /keyring/get?key=test` → `DELETE /keyring/test` successfully.
- [x] `desktop.log` records `desktop:ipc:set key=test status=ok` (no value, no token).
- [x] Replay attack with stale `Date` header gets a 400; rate cap returns 429 above 100 req/s per token.
- [x] **Build + UI check:** desktop launches; webview renders without console errors; no stray ports remain bound after quit.

## Tasks

1. [001 — Add IPC server module](./001-add-ipc-server-module-[done].md)
2. [002 — Wire IPC into Tauri setup](./002-wire-ipc-into-tauri-setup-[done].md)
3. [003 — Add Rust IPC tests](./003-add-rust-ipc-tests-[done].md)
4. [004 — Add server keyring client](./004-add-server-keyring-client-[done].md)

## Demo / verification

```
pnpm --filter desktop tauri:dev
# tail desktop.log to see GUEPARD_KEYRING_PORT logged at startup
# from another terminal, drive the IPC manually:
PORT=<from log> TOKEN=<from log> \
  curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
       --data '{"key":"test","value":"x"}' http://127.0.0.1:$PORT/keyring/set
curl -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$PORT/keyring/get?key=test"
curl -X DELETE -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$PORT/keyring/test"
```

Observe: set returns 204, get returns `{"value":"x"}`, delete returns 204; same calls without the bearer return 401; quitting the app drops the port.

## Questions surfaced

- <bullet>

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

## Notes

- 002 — `lib.rs::append_log_line` now redacts the IPC token (`OnceLock`) and any `Bearer <hex>` value as defence in depth; the IPC server runs on a dedicated thread for the process lifetime.
- 003 — Rust unit tests cover all four invariants from the acceptance list — bearer round-trip (×3), CRUD, rate cap, stale `Date` — using raw TCP + a `HashMap`-backed `on_request` stub, fresh `127.0.0.1:0` per test.
- 004 — `apps/server/src/lib/keyring-client.ts` is sidecar-side; never imported by route handlers. Errors carry verb + key + status only — no token, no value.
