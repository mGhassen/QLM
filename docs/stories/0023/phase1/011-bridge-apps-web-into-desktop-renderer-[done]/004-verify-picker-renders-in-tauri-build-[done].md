---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - apps/desktop/README.md
validation:
  kind: typecheck-only
---

# Verify picker renders in Tauri build

End-to-end manual verification that `pnpm --filter desktop tauri:build` produces a `.app` whose webview reaches the first-run picker (story 008) once `app_config_dir/config.json` is absent.

## Done when

- [ ] `pnpm --filter desktop tauri:build` succeeds.
- [ ] `rm -f "$HOME/Library/Application Support/run.qlm.desktop/config.json"` then `open "apps/desktop/src-tauri/target/release/bundle/macos/QLM Desktop.app"` shows the **full-screen first-run picker** (Cloud / Custom radios + Continue button), NOT the previous "sidecar pending" landing.
- [ ] Tauri devtools console has no fatal errors. Some warnings about missing SSR primitives are acceptable but documented in the README.
- [ ] `apps/desktop/README.md` updated with:
  - One paragraph documenting the new bridge (apps/desktop reads routes from apps/web/src/routes/, root is desktop-specific).
  - Known gaps (which apps/web routes break inside the SPA — anything that uses TanStack Start `createServerFn` etc.).
  - The `rm config.json` recipe to re-trigger the picker for testing.
- [ ] `pnpm typecheck` 51/51 green.

## Notes

- Spec anchor: `#10-verification-plan`.
- This is the human-eyeball gate that closes the story-level "build + UI check (mandatory)" acceptance criterion. The user will open the .app and confirm the picker renders.
- If the picker fails to render and the issue is a `<Scripts/>` / `<HeadContent/>` regression, that's an iteration on task 003. If it's a missing provider (theme, i18n, query client), iteration on task 002. Surface the diagnosis here, fix in the appropriate task's files allowlist.
