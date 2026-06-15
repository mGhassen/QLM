---
story: ./story.md
status: done
layer: docs
model: haiku
files:
  - apps/desktop/package.json
  - apps/desktop/tsconfig.json
validation:
  kind: typecheck-only
---

# Wire Tauri package.json scripts

Replace the (now empty of electron) `apps/desktop/package.json` with Tauri-shaped scripts so `pnpm --filter desktop tauri:dev` and `pnpm --filter desktop tauri:build` are the canonical entry points.

## Done when

- [ ] `apps/desktop/package.json` declares the package as `private: true`, name `desktop`, type `module` (or commonjs — match the rest of `apps/*`).
- [ ] Scripts present: `tauri` (`tauri`), `tauri:dev` (`tauri dev`), `tauri:build` (`tauri build`). No electron scripts remain.
- [ ] `devDependencies` minimally includes `@tauri-apps/cli` (matching the Tauri v2 line). No electron, no `concurrently`, no `nodemon`, no `wait-on`, no `cross-env`.
- [ ] `apps/desktop/tsconfig.json` is removed if it only existed for the electron compile step (the Rust crate doesn't need TS tooling). If retained, it must compile cleanly under the project base.
- [ ] `pnpm install` resolves cleanly with no peer-dep warnings related to the change.
- [ ] `pnpm typecheck` stays green.
- [ ] `pnpm --filter desktop tauri --version` prints the Tauri CLI version (sanity check that the dep resolved).

## Notes

- Spec anchor: `#78-desktop-shell-appsdesktop`.
- Sidecar build wiring (`build:desktop` chain) lands in story 002 — keep this task focused on Tauri-only scripts.
