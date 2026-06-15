---
story: ./story.md
status: skipped
layer: docs
model: haiku
files:
  - apps/desktop/electron/
  - apps/desktop/electron-builder.yml
  - apps/desktop/package.json
  - apps/desktop/scripts/
validation:
  kind: typecheck-only
---

# Purge Electron scaffold

Delete the unused Electron scaffold under `apps/desktop/` so the Tauri rewrite has a clean slate.

## Skipped because

`apps/desktop/` does not exist in this repo. The Electron scaffold the spec referenced lives in qwery-core (`/Users/hani.chalouati/Documents/work/qlm/qwery-core/apps/desktop/`), not here. `architecture.md` mentions "apps/desktop — Electron wrapper" aspirationally; there are no files to delete. Folder was created greenfield by task 002, so this task became a no-op.

## Done when

- [ ] `apps/desktop/electron/` removed entirely (`main.ts`, `preload.ts`, `global.d.ts`).
- [ ] `apps/desktop/electron-builder.yml` removed.
- [ ] Electron-related entries removed from `apps/desktop/package.json`: deps `electron`, `electron-builder`, `concurrently`, `cross-env`, `nodemon`, `rimraf`, `wait-on`; scripts `clean`, `compile`, `compile:watch`, `prepare:renderer`, `dev`, `dev:standalone`, `start:electron`, `package`, `start`, `build`.
- [ ] `apps/desktop/scripts/prepare-renderer.mjs` removed (along with any other electron-only scripts under `apps/desktop/scripts/`).
- [ ] `apps/desktop/dist/` and `apps/desktop/build/` removed if present (build artefacts).
- [ ] `pnpm install` resolves cleanly (lockfile updated for the dropped deps).
- [ ] `pnpm typecheck` stays green across the monorepo.

## Notes

- Spec anchor: `#78-desktop-shell-appsdesktop` — the spec calls these out as "Delete:" entries.
- Keep `apps/desktop/package.json` itself (replaced in task 004 with Tauri-shaped scripts) — only its electron content goes here.
