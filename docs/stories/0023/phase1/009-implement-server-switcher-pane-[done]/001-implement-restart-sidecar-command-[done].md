---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/src-tauri/src/restart.rs
  - apps/desktop/src-tauri/src/lib.rs
validation:
  kind: typecheck-only
---

# Implement restart-sidecar Tauri command

Replace the `restartSidecar()` Tauri-invoke stub (declared in `packages/shell-runtime` since story 005 but unimplemented in Rust) with a real `#[tauri::command] restart_sidecar` that kills the current sidecar child, removes the PID file, and respawns with up-to-date env (re-read keyring + config + IPC token).

## Done when

- [ ] `apps/desktop/src-tauri/src/restart.rs` exposes `#[tauri::command] async fn restart_sidecar(app: tauri::AppHandle, state: tauri::State<'_, ChildHandle>) -> Result<(), String>` where `ChildHandle = Arc<Mutex<Option<CommandChild>>>` is shared with the `.setup(...)` block.
- [ ] `lib.rs` lifts the existing `child_state` into a managed Tauri `State` (so `restart_sidecar` and the existing close/quit listeners both reach it via `app.state::<ChildHandle>()`).
- [ ] `restart_sidecar` flow: lock the state → if `Some(child)` then `kill()` and drop → `kill_pid_best_effort` as belt-and-suspenders → remove PID file → re-run the env-injection + spawn block (extracted into a helper if it makes the diff smaller, otherwise inline) → write the new PID → store `Some(new_child)` back.
- [ ] Errors return `Err(String)` with redacted messages — the IPC-token redaction added in story 004 already covers `Bearer …` patterns; never include keychain values.
- [ ] `lib.rs` `invoke_handler!` registers `restart_sidecar`.
- [ ] `cargo build` + `cargo clippy --release -- -D warnings` + `cargo fmt --check` green. `pnpm typecheck` green.

## Notes

- Re-spawn must re-read the keyring (`MANAGED_KEYS`, `refresh_token:<server-url>`) and `config.json` so a server-URL change is honoured. The simplest implementation calls a shared `spawn_sidecar(app, &state)` helper that the `.setup(...)` block also uses.
- Spec anchor: `#52-endpoints` (Tauri command `restart_sidecar()` row).
- Spec anchor: `#33-user-flows-happy-paths` (Server-URL change steps 3–4).
