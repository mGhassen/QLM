---
spec: docs/specs/0029-databases-app-phase1.md
spec_sections:
  - "#manifest-upgrade"
status: wip
started: 2026-04-30
finished: null
blocks: []
blocked_by: []
---

# Manifest flat-routes plural upgrade

## Goal

Add `flatRoutes?: FlatRouteDef[]` to `PluginManifest` so apps can contribute multiple flat routes; existing apps using `flatRoute` continue to work unchanged.

## Scope

**In scope**
- `packages/shell-contracts/src/manifest.ts` — add `flatRoutes?: FlatRouteDef[]`
- `apps/web/src/shell/app-registry.ts` — `FlatRoots` module export, `flatRoots` registry map, `getByFlatPrefix`/`getFlatRoot`/`getFlatRouteParams` methods
- `apps/web/src/routes/$flatPrefix.$.tsx` — use new registry methods

**Out of scope**
- Any existing app manifest changes — they keep `flatRoute` and `FlatRoot` unmodified
- Databases/PerformanceProfiles app creation — Story 006+

## Acceptance criteria

- [ ] `pnpm typecheck` green across all packages
- [ ] Existing flat routes (`/notebook/…`, `/node/…`, `/datasource/…`) still resolve correctly
- [ ] `PluginManifest` type accepts `flatRoutes: [{ prefix: 'databases', params: [] }, { prefix: 'database', params: ['id'] }]`
- [ ] `AppRegistry.getByFlatPrefix('databases')` returns an entry when the manifest has `flatRoutes` with that prefix
- [ ] `AppRegistry.getFlatRoot('databases')` returns the correct lazy component from `FlatRoots` map

## Tasks

Populated during implementation.

## Demo / verification

```bash
pnpm typecheck
# All packages green
```

Create a temporary test manifest with `flatRoutes: [{ prefix: 'test-a', params: [] }, { prefix: 'test-b', params: ['id'] }]` — TypeScript accepts it without error.

## Questions surfaced

-

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
