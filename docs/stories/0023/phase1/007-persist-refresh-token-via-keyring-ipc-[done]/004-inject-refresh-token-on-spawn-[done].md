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

# Inject refresh token on spawn

After `lib.rs` injects `CONFIG_KEYS` (so `QLM_SERVER_URL` is known), look up `refresh_token:${url}` in the OS keychain and pass it to the sidecar as `QLM_REFRESH_TOKEN` — closing the loop with task 001's boot rehydrate.

## Done when

- [ ] In `apps/desktop/src-tauri/src/lib.rs`, after the `CONFIG_KEYS` env-injection block (where `cmd.env(*key, value)` lands for `QLM_SERVER_URL`), capture the chosen `server_url: Option<String>` from the parsed `config.json`.
- [ ] When `server_url` is `Some`, build the keyring lookup key `format!("refresh_token:{server_url}")` and call `keyring_cmds::keyring_entry(&key)?.get_password()`. On `Ok(value)` where `!value.is_empty()`, append `.env("QLM_REFRESH_TOKEN", value)` to `cmd`.
- [ ] Log `desktop:refresh_token=set` on hit, `desktop:refresh_token=missing` on `NoEntry`, `desktop:refresh_token=error:<code>` on other errors. Never log the token value.
- [ ] The new `Bearer …` redaction added in story 004 already covers the env value if it accidentally surfaces; do not log it.
- [ ] `cargo build` + `cargo clippy --release -- -D warnings` + `cargo fmt --check` green. `pnpm typecheck` green.

## Notes

- The lookup must happen after `CONFIG_KEYS` injection because we depend on the resolved `QLM_SERVER_URL` to namespace the keychain entry.
- Spec anchor: `#33-user-flows-happy-paths` ("App restart with existing session" steps 1–2).
- Spec anchor: `#78-desktop-shell-appsdesktop` ("**Adds:** … `QLM_REFRESH_TOKEN` injection at sidecar spawn").
