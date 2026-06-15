---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/vite.config.ts
  - apps/desktop/tsconfig.json
  - apps/desktop/package.json
validation:
  kind: typecheck-only
---

# Add curated workspace deps for desktop SPA

**Approach pivot:** scanning all of `apps/web/src/routes/` from `apps/desktop`'s vite plugin pulled in too many Node-only deps (`agent-factory-sdk` uses `node:fs/promises`, `node:os`; `packages/supabase` uses `node:process`; etc.). Falling back to qwery-core's curated re-export pattern: `apps/desktop/src/routes/` stays small and re-exports specific apps/web routes file-by-file.

This task wires the build infrastructure: workspace deps, dedupe, and Tauri-friendly vite config.

## Done when

- [ ] `apps/desktop/package.json` declares the **minimum** workspace deps the desktop bundle needs (curate aggressively — every dep added here is a dep that ships in the .app):
  - `@qlm/i18n` — for translations
  - `@qlm/shared` — for `isDesktopApp()` + the `DesktopApi` types
  - `@qlm/shell-runtime` — for `useRuntime()` + Tauri-command wrappers (story 005)
  - `@qlm/ui` — for Shadcn primitives
  - `@tanstack/react-query` — required by router context
  - `react-i18next` — required by `useTranslation()` calls in shared components
  - `@tanstack/react-router`, `@tauri-apps/api`, `react`, `react-dom` (already there)
- [ ] `apps/desktop/vite.config.ts` `resolve.dedupe` includes `['i18next', 'react-i18next', 'react', 'react-dom']` so transitive copies of these don't bloat the bundle or break hooks. Mirror apps/web's pattern.
- [ ] `apps/desktop/vite.config.ts` `tanstackRouter` plugin keeps `routesDirectory: './src/routes'` (apps/desktop owns its own small route tree). Do NOT point at apps/web's routes — that pulls in the entire SPA + all Node-only deps.
- [ ] `apps/desktop/tsconfig.json` `paths` for `@/*` → `../web/src/*` already exists; leave it alone. The `@/` alias is what re-export shims will use.
- [ ] `pnpm install` resolves cleanly.
- [ ] `pnpm typecheck` for `apps/desktop` passes.

## Notes

- Spec anchor: `#75-presentation-appsweb`, `#78-desktop-shell-appsdesktop`.
- Tasks 002/003 add the route shim + main.tsx wiring on top of this dep foundation.
