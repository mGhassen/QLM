---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/src-tauri/tauri.conf.json
  - apps/desktop/package.json
validation:
  kind: typecheck-only
---

# Repoint Tauri at web SPA

With tasks 001 + 002 landed, Tauri can load `apps/web` directly instead of the placeholder SPA in `apps/desktop/src/`. This task rewires `tauri.conf.json` + the `tauri:dev` / `tauri:build` scripts so the whole QLM console ships inside the `.app`.

## Done when

- [x] `apps/desktop/src-tauri/tauri.conf.json` `build` block:
  ```json
  "beforeDevCommand": "pnpm --filter web dev",
  "devUrl": "http://localhost:3000",
  "beforeBuildCommand": "pnpm --filter web build",
  "frontendDist": "../../web/dist/client"
  ```
  (paths are relative to `src-tauri/`, so `../../web/dist/client` resolves to `apps/web/dist/client` — the SPA shell location task 001 confirmed).
- [ ] `apps/desktop/package.json` keeps `tauri:dev` and `tauri:build` scripts (they already just invoke `tauri dev` / `tauri build` — the new config takes over). `sidecar:build` stays unchanged.
- [ ] Placeholder `apps/desktop/src/` stays on disk but unused — pruning is a follow-up story so this task stays tight.
- [ ] Verify (manually, flagged for the human-approval gate — typecheck alone can't confirm):
  - `pnpm --filter desktop tauri:dev` opens a window pointed at `http://localhost:3000` and apps/web loads.
  - `pnpm --filter desktop tauri:build` produces a `.app` that opens apps/web from disk.
  - First-run picker still appears when `config.json` is absent (apps/web's `/desktop/first-run` route, `useRuntime() === 'desktop'`).
  - Settings → Server pane visible.
- [ ] `pnpm typecheck` green.

## Notes

- Dev-mode `beforeDevCommand` launches apps/web's Vite on port 3000. If that port is busy because `pnpm dev` is running in another terminal, `tauri dev` will fail to start — flag it to the user in the demo.
- Tauri's `frontendDist` loads `index.html` + hashed assets. Apps/web's SPA build must emit a top-level `index.html` (task 001's done-when covers this).
- Spec anchor: `#78-desktop-shell-appsdesktop` (`tauri.conf.json` — no `frontendDist` bullet originally; this story changes that).
