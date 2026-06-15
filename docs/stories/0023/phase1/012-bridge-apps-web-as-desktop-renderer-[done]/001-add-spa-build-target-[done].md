---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/web/vite.config.ts
validation:
  kind: typecheck-only
---

# Add SPA build target

Give `apps/web` a SPA shell alongside the existing TanStack Start SSR build so Tauri can bundle the SPA from disk. The SSR build stays untouched — cloud deployments keep using it.

## Done when

- [x] `apps/web/vite.config.ts` enables TanStack Start's SPA shell additively: `tanstackStart({ spa: { enabled: true, prerender: { outputPath: '/index' } } })`. The `/index` outputPath is the only value that resolves to a top-level `dist/client/index.html` — the prerender appends `.html` verbatim for the shell case.
- [x] `pnpm --filter web build` produces both:
  - The existing SSR bundle (`dist/server/server.js`)
  - A new SPA shell at `dist/client/index.html` with module preloads + entry script.
- [x] `pnpm typecheck` green.

## Notes

- Simpler than the original plan (no separate `BUILD_MODE=spa` flag, no `dist-spa` folder, no extra `build:spa` script). TanStack Start's `spa.enabled` is purely additive — the SSR pipeline still runs.
- Spec anchor: `#78-desktop-shell-appsdesktop` (the `frontendDist` bullet for the Tauri config).
