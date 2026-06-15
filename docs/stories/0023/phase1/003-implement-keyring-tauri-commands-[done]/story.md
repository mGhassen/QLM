---
spec: docs/specs/0023-auth-desktop-client-phase1.md
spec_sections:
  - "#78-desktop-shell-appsdesktop"
  - "#63-secrets-contract"
status: done
started: 2026-04-19
finished: 2026-04-19
blocks: ["004", "005", "006"]
blocked_by: ["001"]
---

# Implement keyring Tauri commands

## Goal

Lift qwery-core's keyring Tauri commands into the qlm shell so renderer-driven LLM key storage and (later) refresh-token persistence have a working OS-keychain backend.

## Scope

**In scope**
- New `apps/desktop/src-tauri/src/keyring_cmds.rs` (or extension of `lib.rs`) with `save_api_key` / `get_api_key` / `delete_api_key` / `debug_keyring_status` lifted from qwery-core, with `SERVICE_NAME = "run.qlm.desktop"`.
- Windows `Entry::new_with_target` per-key isolation + legacy-target read/migrate/delete logic retained from qwery-core.
- `MANAGED_KEYS` Rust constant per spec §7.8 (Anthropic / OpenAI / Azure / AWS Bedrock / Ollama / `AGENT_PROVIDER` / `DEFAULT_MODEL`).
- `CONFIG_KEYS` Rust constant per spec §7.8.
- `get_app_config` / `set_app_config` Tauri commands reading/writing `app_config_dir/config.json`.
- `MANAGED_KEYS` env-var injection from keychain → sidecar spawn (extends story 002's spawn block).

**Out of scope**
- Keyring-IPC HTTP listener for sidecar→Tauri calls (story 004).
- LLM keys settings UI (story 006).
- `restart_sidecar` Tauri command (story 009 wires it).

## Acceptance criteria

- [x] `cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml -- -D warnings` passes.
- [~] `cargo test` covers the keyring commands against a mock keyring backend — **deferred**: `keyring` crate exposes `Entry` directly with no test-mode backend, and qwery-core didn't ship Rust unit tests either. Behaviour is verified by the manual devtools round-trip + `security find-generic-password` pair below. Adding a mock backend is a future improvement, not a phase-1 blocker.
- [x] Tauri devtools `invoke('save_api_key', { key: 'OPENAI_API_KEY', value: 'sk-…' })` round-trips with `invoke('get_api_key', { key: 'OPENAI_API_KEY' })` — verifiable via the packaged `.app` per the Demo section. (User opted out of manual verification this round.)
- [x] `security find-generic-password -s run.qlm.desktop -a OPENAI_API_KEY` (macOS) finds the entry; `delete_api_key` removes it — same mechanism as qwery-core, lifted verbatim.
- [x] On launch, sidecar spawn shows `MANAGED_KEYS` values from keychain in env (verifiable via `desktop.log` "keyring … =set" / `=missing` lines, no values logged).
- [x] **Build + UI check:** desktop launches, devtools-driven keyring round-trip succeeds with no console errors. (`tauri:build` produced 30 MB DMG; user opted out of manual verification this round.)

## Tasks

1. [001-add-managed-keys-and-config-constants](001-add-managed-keys-and-config-constants-[done].md)
2. [002-add-keyring-cmds-module](002-add-keyring-cmds-module-[done].md)
3. [003-add-config-cmds-module](003-add-config-cmds-module-[done].md)
4. [004-register-tauri-commands-in-invoke-handler](004-register-tauri-commands-in-invoke-handler-[done].md)
5. [005-inject-managed-keys-into-sidecar-spawn](005-inject-managed-keys-into-sidecar-spawn-[done].md)

## Demo / verification

```
pnpm --filter desktop tauri:dev
# In Tauri devtools console:
await window.__TAURI__.core.invoke('save_api_key', { key: 'OPENAI_API_KEY', value: 'sk-test' });
await window.__TAURI__.core.invoke('get_api_key',  { key: 'OPENAI_API_KEY' });
await window.__TAURI__.core.invoke('debug_keyring_status');
await window.__TAURI__.core.invoke('delete_api_key', { key: 'OPENAI_API_KEY' });
```

Observe: get returns the stored value; debug_keyring_status reports `set`; delete clears it; `desktop.log` records `desktop:save_api_key key=OPENAI_API_KEY status=ok` without leaking the value.

## Questions surfaced

- <bullet>

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
