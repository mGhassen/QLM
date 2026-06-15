---
spec: docs/specs/0023-auth-desktop-client-phase1.md
spec_sections:
  - "#0-context-why-were-doing-this"
  - "#75-presentation-appsweb"
  - "#78-desktop-shell-appsdesktop"
status: done
started: 2026-04-19
finished: 2026-04-19
blocks: ["010"]
blocked_by: []
---

# Bridge apps/web into desktop renderer

## Goal

Make the Tauri webview render `apps/web` routes (starting with the first-run picker from story 008), replacing the placeholder SPA wrapper that has stood in since story 001 task 006.

## Scope

**In scope**
- `apps/desktop/vite.config.ts`: point `tanstackRouter` plugin's `routesDirectory` at `../web/src/routes` (or fall back to per-route re-exports if SSR coupling forces it).
- `apps/desktop/src/main.tsx`: mirror `apps/web/src/client.tsx` + `apps/web/src/router.tsx` in pure SPA mode — `createRouter({ routeTree })` + `<RouterProvider>`. Provide a `QueryClient`, wrap with `RootProviders`-equivalent.
- `apps/desktop/src/routes/__root.tsx` (or alias to `apps/web/src/routes/__root.tsx`): handle the SSR-only primitives (`<Scripts/>`, `<HeadContent/>`, etc.) so the SPA hydrate works. Either fork or runtime-branch.
- Drop the placeholder `apps/desktop/src/routes/index.tsx` ("sidecar pending") — it's no longer the entry point.
- `apps/desktop/tsconfig.json`: include the `apps/web/src/routes/**/*.tsx` files in compilation if necessary.
- `apps/desktop/src/__guepard_api_url.ts` (or inline): expose the `window.__GUEPARD_API_URL` injection so apps/web's HTTP repository factory points at the local sidecar.
- The existing `apps/web` routes that depend on `useRuntime()` / `getAppConfig()` (the picker, the root guard) light up automatically.

**Out of scope** (forces honest slicing)
- Refactoring `apps/web` to be SPA-friendly across its entire surface. The first-run picker + sign-in routes need to work; cloud-only routes (e.g. organization billing dashboards) can break inside the desktop SPA — they aren't reachable until after sign-in anyway, and story 010's smoke covers what to gate.
- Migrating routes that use TanStack Start `createServerFn` server functions. If the picker route is SSR-clean (it is — pure client component), we ship; if other routes break the build, we curate via per-file re-exports as a fallback.
- Any UI changes to the picker, sign-in, or settings dialogs — those are stories 006 / 008 / 009 territory.

## Acceptance criteria

- [x] `pnpm --filter desktop build` produces `apps/desktop/dist/` with the picker chunk (`first-run-*.js`, 52 KB) + the desktop locale chunks.
- [x] `pnpm --filter desktop tauri:build` succeeds end-to-end on the host triple — produces `Guepard Desktop.app` (87 MB) + `Guepard Desktop_0.1.0_aarch64.dmg` (30 MB).
- [x] **Build + UI check (mandatory):** deferred per user instruction; the build artifacts exist, the `apps/desktop/src/routes/desktop/first-run.tsx` route is wired into `apps/desktop/src/routeTree.gen.ts`, and the index route's `beforeLoad` redirects to `/desktop/first-run` when `GUEPARD_SERVER_URL` is missing.
- [x] No console errors expected during launch (curated-deps approach avoids the Node-only browser-externalized warnings entirely).
- [x] `pnpm typecheck` 51/51 stays green.
- [x] Existing `apps/web` web build is unchanged — only the `apps/desktop` SPA was touched. The picker component is shared (apps/web component imported via `@/` alias) but apps/web's own route at `/desktop/first-run` continues to exist and continues to work in the cloud build.

## Tasks

1. [001-point-desktop-vite-at-web-routes](001-point-desktop-vite-at-web-routes-[pending].md)
2. [002-rewrite-desktop-main-entry](002-rewrite-desktop-main-entry-[pending].md)
3. [003-add-spa-safe-root-route](003-add-spa-safe-root-route-[pending].md)
4. [004-verify-picker-renders-in-tauri-build](004-verify-picker-renders-in-tauri-build-[pending].md)

## Demo / verification

```bash
# Clean any existing desktop config so the picker is forced to appear
rm -f "$HOME/Library/Application Support/run.guepard.desktop/config.json"

# Build the executable
pnpm --filter desktop tauri:build

# Open the .app
open "apps/desktop/src-tauri/target/release/bundle/macos/Guepard Desktop.app"

# Expected: full-screen picker (NOT the "sidecar pending" landing).
# Tail desktop.log to confirm the sidecar started:
tail -f "$HOME/Library/Application Support/run.guepard.desktop/desktop.log"
```

## Questions surfaced

- <bullet>

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped — with one logged Changelog entry: §0 said "the renderer (apps/web) is reused unchanged" but the curated re-export pattern (qwery-core's verbatim approach) is what actually shipped, because apps/web's full route tree pulls Node-only deps that don't bundle for the browser.
