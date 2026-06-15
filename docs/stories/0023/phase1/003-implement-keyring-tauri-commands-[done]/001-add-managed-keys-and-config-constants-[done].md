---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/src-tauri/src/keys.rs
  - apps/desktop/src-tauri/src/lib.rs
validation:
  kind: typecheck-only
---

# Add MANAGED_KEYS and CONFIG_KEYS constants

Define the Rust constants that the keyring + config commands and the sidecar-spawn block will share.

## Done when

- [ ] New `apps/desktop/src-tauri/src/keys.rs` exposes:
  - `pub const MANAGED_KEYS: &[&str] = &[...]` — Anthropic / OpenAI / Azure / AWS Bedrock / Ollama / `AGENT_PROVIDER` / `DEFAULT_MODEL`, exactly as listed in spec §7.8.
  - `pub const CONFIG_KEYS: &[&str] = &[...]` — `QLM_SERVER_URL`, `QLM_TELEMETRY_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, exactly as listed in spec §7.8.
- [ ] `lib.rs` declares `mod keys;` so the constants are reachable from the other shell modules.
- [ ] No re-export of secrets in any docstring (the constants are key NAMES, not values — but be explicit in a top-of-module comment).
- [ ] `cargo build` and `cargo clippy --release -- -D warnings` and `cargo fmt --check` are all green.

## Notes

- Spec anchor: `#78-desktop-shell-appsdesktop` (MANAGED_KEYS + CONFIG_KEYS lists are spelled out verbatim there).
- Reference: `qwery-core/apps/desktop/src-tauri/src/lib.rs` lines for the `MANAGED_KEYS` + `CONFIG_KEYS` arrays. Don't lift qwery-specific keys (`QWERY_*`) — use the qlm list per the spec.
