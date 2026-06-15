---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/index.html
  - apps/desktop/src/main.tsx
  - apps/desktop/src/__root.tsx
  - apps/desktop/src/routes/index.tsx
  - apps/desktop/vite.config.ts
  - apps/desktop/tsconfig.json
  - apps/desktop/package.json
  - apps/desktop/src-tauri/tauri.conf.json
validation:
  kind: typecheck-only
---

# Wrap client-only SPA

Stand up a thin client-only SPA inside `apps/desktop/` mirroring qwery-core's pattern (separate `apps/desktop/app/`-style entry, Vite alias to share components from `apps/web`), so `pnpm --filter desktop tauri:build` produces a working `.app` instead of an `asset not found: index.html` shell. `apps/web` is TanStack Start (SSR) — desktop uses TanStack Router directly in SPA mode.

## Done when

- [ ] `apps/desktop/index.html` exists with `<div id="root">` + the dev script tag.
- [ ] `apps/desktop/src/main.tsx` creates a TanStack Router (no SSR), wraps it with the existing `RootProviders` from `apps/web`, and mounts via `createRoot`.
- [ ] `apps/desktop/src/__root.tsx` renders `<Outlet/>` without `<Scripts>` or `<HeadContent>` (those are SSR-only) — TanStack Router's title/meta works fine in SPA mode without them.
- [ ] `apps/desktop/src/routes/index.tsx` renders a tiny landing page (QLM logo + "QLM Desktop · sidecar pending") so the bundle has something to show pre-sidecar.
- [ ] `apps/desktop/vite.config.ts` aliases `@/` → `../web/src` so future stories can import shared route components without copy-paste.
- [ ] `apps/desktop/tsconfig.json` extends the project base and pulls in `apps/web/src/*` types via the alias.
- [ ] `apps/desktop/package.json` adds `dev` (`vite`), `build` (`vite build`), and the deps: `@tanstack/react-router`, `@tanstack/react-query`, `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `@tailwindcss/vite`, `@qlm/ui`, `@qlm/i18n`, `@qlm/shared`. Strict port 1420 to mirror qwery-core.
- [ ] `apps/desktop/src-tauri/tauri.conf.json` updated: `beforeDevCommand: "pnpm --filter desktop dev"`, `devUrl: "http://localhost:1420"`, `beforeBuildCommand: "pnpm --filter desktop build"`, `frontendDist: "../dist"`.
- [ ] `pnpm --filter desktop build` produces `apps/desktop/dist/index.html` + assets.
- [ ] `pnpm --filter desktop tauri:build` produces a `.app` and `.dmg` that **launch and render the landing page** (no `asset not found`).
- [ ] `pnpm typecheck` stays green across the monorepo.
- [ ] `apps/desktop/.gitignore` updated to ignore `dist/` (built SPA output).
- [ ] `apps/desktop/README.md` updated with the new architecture summary (Tauri shell + client SPA + future sidecar).

## Notes

- Spec anchor: `#75-presentation-appsweb` and `#78-desktop-shell-appsdesktop`. The spec assumed `apps/web` could be reused unchanged via sidecar serving — that holds at runtime once the sidecar exists, but at build time the web SSR build can't be served as `frontendDist`. qwery-core's parallel client-only SPA pattern is the workaround.
- Real route sharing (importing a curated subset of `apps/web/src/routes/*`) is **out of scope here** — this task ships the wrapper + landing only. Stories 008 / 009 will wire the actual desktop screens.
- TanStack Start primitives (`<Scripts>`, `<HeadContent>`, `StartClient`) are deliberately NOT used here.
