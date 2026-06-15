---
story: ./story.md
status: done
layer: docs
model: haiku
files:
  - apps/desktop/package.json
  - apps/desktop/src-tauri/tauri.conf.json
  - apps/desktop/README.md
validation:
  kind: typecheck-only
---

# Chain build:desktop into tauri dev

Make `pnpm --filter desktop tauri:dev` (and `tauri:build`) automatically rebuild the sidecar binary first, so a single command is enough to launch a fully-functional shell.

## Done when

- [ ] `apps/desktop/package.json` adds:
  - `"sidecar:build": "pnpm --filter server build:desktop"` script.
  - `"tauri:dev"` is rewritten to `"pnpm sidecar:build && tauri dev"` (or equivalent — but the chain MUST run before `tauri dev`).
  - `"tauri:build"` likewise rewritten to `"pnpm sidecar:build && tauri build"`.
- [ ] `apps/desktop/src-tauri/tauri.conf.json` `build.beforeDevCommand` and `beforeBuildCommand` are unchanged (they still build the SPA via `pnpm --filter desktop dev` / `build`); the sidecar build runs before Tauri kicks them off.
- [ ] `apps/desktop/README.md` updated with one short paragraph documenting the new behaviour: `pnpm --filter desktop tauri:dev` now builds the sidecar first, then runs Tauri.
- [ ] `pnpm --filter desktop tauri --version` still resolves (no breakage of the Tauri CLI dep chain).
- [ ] `pnpm typecheck` stays green.

## Notes

- Spec anchor: `#74-server-appsserver`, `#78-desktop-shell-appsdesktop`.
- Don't introduce a turbo task for this — it's a per-`apps/desktop` concern.
