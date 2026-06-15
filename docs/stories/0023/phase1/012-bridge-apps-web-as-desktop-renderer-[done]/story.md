---
spec: docs/specs/0023-auth-desktop-client-phase1.md
spec_sections:
  - "#75-presentation-appsweb"
  - "#78-desktop-shell-appsdesktop"
status: done
started: 2026-04-21
finished: 2026-04-23
blocks: ["010"]
blocked_by: ["011"]
---

# Bridge apps/web as desktop renderer

## Goal

Load the full `apps/web` SPA inside the Tauri webview so the desktop `.app` ships every route + feature (sign-in, orgs, projects, notebooks, settings → server pane) instead of the apps/desktop placeholder stub.

## Scope

**In scope**
- Add a SPA build target to `apps/web/vite.config.ts` (alongside the existing SSR output) so prod builds emit a standalone `index.html` + assets loadable from disk.
- Wire `window.__QLM_API_URL` through `apps/web/src/lib/repositories/api-client.ts` so every API call reaches the Tauri-spawned sidecar regardless of origin. Add `apps/web/src/globals.d.ts` for the Window type.
- Repoint `apps/desktop/src-tauri/tauri.conf.json`:
  - `beforeDevCommand` → `pnpm --filter web dev`
  - `devUrl` → `http://localhost:3000`
  - `beforeBuildCommand` → `pnpm --filter web build:spa`
  - `frontendDist` → `../../web/dist-spa`
- `apps/desktop/src/` placeholder SPA becomes dormant — left in place but unused (real cleanup deferred).

**Out of scope** (deferred to follow-up stories)
- Removing the now-dead `apps/desktop/src/` tree + associated scripts (route generator, i18n preload files).
- Porting `apps/web`'s sign-in to POST `/auth/sign-in` on the sidecar (story 007's sidecar routes are wired but apps/web still uses the Supabase JS SDK directly — the gap is intentional; story 013+ territory).
- Server-URL change affecting the SPA's Supabase target. `VITE_SUPABASE_URL` stays baked at build time for phase 1; the first-run picker only rewires the sidecar's target.

## Acceptance criteria

- [x] `pnpm --filter web build` produces `apps/web/dist/client/index.html` + `assets/` (SPA shell additive to the existing SSR build — no separate `build:spa` script needed). SSR still produces `dist/server/server.js`.
- [x] `pnpm --filter desktop tauri:dev` launches the window, points at `localhost:3000`, and apps/web's root route loads (sign-in or home, depending on session).
- [x] `pnpm --filter desktop tauri:build` produces a `.app` that loads apps/web's UI from disk. `/api/*` requests reach the Bun sidecar via `window.__QLM_API_URL` (verified). Mixed-content note: the prod `.app` cannot reach **HTTP** local Supabase due to WebKit's secure-context rules — that's a separate concern for cloud-HTTPS distribution and a future "sidecar-owned auth" story.
- [x] First-run flow: deleting `config.json` redirects to apps/web's `/desktop/first-run` (covered by story 008 + the runtime gate).
- [x] Settings → Server pane (story 009) renders in desktop runtime via `useRuntime() === 'desktop'`.
- [x] `pnpm typecheck` green across the monorepo.

## Tasks

1. [001 — Add SPA build target](./001-add-spa-build-target-[done].md)
2. [002 — Wire API URL from Tauri](./002-wire-api-url-from-tauri-[done].md)
3. [003 — Repoint Tauri at web SPA](./003-repoint-tauri-at-web-spa-[done].md)

## Demo / verification

```bash
# Dev mode — loads apps/web live from its Vite dev server
pnpm --filter desktop tauri:dev

# Prod package
pnpm --filter desktop tauri:build
open "apps/desktop/src-tauri/target/release/bundle/macos/QLM Desktop.app"

# Fresh first-run
rm -f "$HOME/Library/Application Support/run.qlm.desktop/config.json"
open "apps/desktop/src-tauri/target/release/bundle/macos/QLM Desktop.app"
```

## Questions surfaced

- <bullet>

## Notes

- 001 — Simpler than originally planned: TanStack Start's `spa: { enabled: true, prerender: { outputPath: '/index' } }` is additive — single `pnpm --filter web build` produces both SSR (`dist/server/server.js`) + SPA shell (`dist/client/index.html`). No `BUILD_MODE` flag, no `dist-spa` folder, no `build:spa` script. Tasks 002 + 003 will reflect the shared `dist/client` path.
- 002 — `getApiBaseUrl()` short-circuits on `window.__QLM_API_URL` and returns `${url}/api` so existing `fetch(\`${base}${endpoint}\`)` callers keep working in both web (relative `/api`) and desktop (absolute sidecar URL).
- 003 — `tauri.conf.json` repointed at apps/web (`devUrl: localhost:3000`, `frontendDist: ../../web/dist/client`). The apps/desktop placeholder SPA stays on disk but is no longer rendered — pruning is a follow-up story.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped — see Changelog entry on the spec for the deviation summary.
