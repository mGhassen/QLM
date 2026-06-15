---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/src-tauri/tauri.conf.json
  - apps/desktop/src-tauri/capabilities/default.json
validation:
  kind: typecheck-only
---

# Register sidecar in Tauri config

Update Tauri's bundle + capability manifests so the freshly built `apps/desktop/src-tauri/binaries/api-server-<triple>` is recognised as an external binary and the Rust shell is allowed to spawn it.

## Done when

- [ ] `apps/desktop/src-tauri/tauri.conf.json` `bundle.externalBin` lists `binaries/api-server` (the per-triple suffix is appended automatically by Tauri's bundling, mirroring qwery-core's pattern).
- [ ] `apps/desktop/src-tauri/capabilities/default.json` adds `shell:allow-execute` scoped to the `api-server` sidecar (and `api-server` only — no shell wildcards). Use `shell:allow-execute` with a `permissions[].allow` array entry naming the sidecar binary, mirroring Tauri 2's standard pattern (qwery-core's allowlist is the reference).
- [ ] `cd apps/desktop/src-tauri && cargo check` succeeds — the capability JSON is schema-valid and the bundle config parses.
- [ ] `pnpm typecheck` stays green.

## Notes

- Spec anchor: `#78-desktop-shell-appsdesktop`.
- The actual sidecar **spawn** call lands in task 004 (`wire-sidecar-spawn-in-tauri-lib`); this task just registers it.
