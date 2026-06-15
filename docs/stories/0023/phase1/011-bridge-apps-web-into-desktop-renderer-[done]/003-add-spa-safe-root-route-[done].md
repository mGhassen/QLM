---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - apps/desktop/src/routes/__root.tsx
  - apps/desktop/vite.config.ts
validation:
  kind: typecheck-only
---

# Add SPA-safe root route

`apps/web/src/routes/__root.tsx` renders `<html>` / `<body>` / `<HeadContent>` / `<Scripts>` — TanStack Start primitives that hydrate `document` directly. For the desktop SPA, which mounts into `<div id="root">` via `createRoot`, that wrapper crashes hydration. Add a desktop-specific `__root.tsx` and configure the router plugin to prefer it.

## Done when

- [ ] New `apps/desktop/src/routes/__root.tsx` exports a `Route` from `createRootRouteWithContext<RouterAppContext>()({ component: () => <Outlet /> })`. NO `<html>`, `<body>`, `<HeadContent>`, or `<Scripts>` — all SSR-only.
- [ ] Imports `RouterAppContext` from `apps/web/src/router.tsx` (via the `@/` alias) so the type is shared.
- [ ] `apps/desktop/vite.config.ts` configures the `tanstackRouter` plugin to find `__root.tsx` from `apps/desktop/src/routes/` even though the rest of the routes come from `apps/web/src/routes/`. Mechanism options (pick the one that works):
  - **A.** Plugin option (if exposed): `customScaffolding`, `routeFilePrefix`, or similar to override `__root` only.
  - **B.** `resolve.alias` rewrite that intercepts the route-tree's `__root` import and points it at `apps/desktop/src/routes/__root.tsx`.
  - **C.** Set `routesDirectory` to a virtual location that contains a single `__root.tsx` plus a re-export from `apps/web/src/routes/`. Heaviest, last-resort.
- [ ] `pnpm --filter desktop exec vite build` succeeds; `apps/desktop/src/routeTree.gen.ts` references the desktop `__root.tsx`, not apps/web's.
- [ ] `pnpm typecheck` is green across the monorepo.

## Notes

- Spec anchor: `#75-presentation-appsweb`.
- The picker route (`apps/web/src/routes/desktop/first-run.tsx`) doesn't use `<HeadContent>` / `<Scripts>` itself, so it should render fine once the SSR-only root wrapper is bypassed.
- If aliasing is too fragile, fall back to per-file re-export shims (story scope grows, flag in `## Questions surfaced`).
