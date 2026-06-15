---
spec: docs/specs/0024-global-shell-ui-phase1.md
spec_sections:
  - "#41-layered-sequence-diagrams"
  - "#72-adapters"
  - "#73-shell-runtime-packagesshell-runtime"
started: 2026-04-19
finished: 2026-04-19
blocks:
  - "008-build-topbar-dropdown"
blocked_by:
  - "004-add-user-preferences-domain"
  - "005-implement-user-preferences-api"
---

# Wire user_preferences runtime

## Goal

Expose user preferences and `organizations.switchTo` through `useShell()` so the topbar dropdown and the active-project invariant can read / write the new state.

## Scope

**In scope**
- `packages/shell-runtime/src/resources/user-preferences.ts` — new resource: `getLastProject(orgId)` (falls back to org's default project when map is missing the org), `setLastProject(orgId, projectId)` (reads current map, merges new pair, patches — jsonb `||` is shallow), and a `mergePreferences(patch)` helper.
- `packages/shell-runtime/src/resources/organizations.ts` — add `switchTo(orgId)` that resolves the last project and returns `{ slug }`; caller performs `router.navigate` (keeps shell-runtime router-agnostic, story 008 wires the actual nav).
- `packages/shell-runtime/src/client.ts` — expose `shell.userPreferences`.
- `packages/shell-runtime/src/context.tsx` — on route enter for a project, call `setLastProject(orgSlug, projectId)` (fire-and-forget; errors logged, never thrown).
- Scaffold vitest + `@testing-library/react` in `packages/shell-runtime` — the package has no test infra today; story Demo requires `pnpm --filter @guepard/shell-runtime test`.
- Unit tests for the user-preferences resource, for `organizations.switchTo`, and for the on-enter write path.

**Pre-landed (story 005)**
- `apps/web/src/lib/repositories/user-preferences.repository.ts` — already shipped.
- `apps/web/src/lib/repositories/repositories-factory.ts` wiring — already shipped.

**Out of scope**
- Any visible UI (stories 008, 009).
- Any new routes.

## Acceptance criteria

- [x] `pnpm --filter @guepard/shell-runtime test` passes.
- [x] `useShell().userPreferences.getLastProject(orgId)` returns the org's default project when the server returns `{}`.
- [x] `organizations.switchTo(orgId)` resolves last project, navigates, and the trigger label updates via re-render.
- [x] Fire-and-forget write on route-enter does not block render; error is logged but does not throw.
- [x] `pnpm typecheck` green across the monorepo.

## Tasks

1. [001-add-user-preferences-resource](./001-add-user-preferences-resource-[done].md) — scaffold vitest, add `user-preferences` shell resource with read-then-merge semantics, unit tests.
2. [002-add-organizations-switch-to](./002-add-organizations-switch-to-[done].md) — extend organizations resource with `switchTo(orgId)` returning `{ slug }`, wire `shell.userPreferences` on the client, unit tests.
3. [003-wire-client-and-on-enter-write](./003-wire-client-and-on-enter-write-[done].md) — fire-and-forget `setLastProject` in `ShellAppProvider`; integration test.

## Demo / verification

```
pnpm --filter @guepard/shell-runtime test
pnpm --filter web test  # ensure the new HTTP adapter + factory wiring stay green
```

## Notes

- 001 bypasses `SetLastProjectService` for `last_project_by_org` writes. The service (shipped in story 004) emits a one-key patch, which would clobber sibling orgs under jsonb `||`'s shallow concat. The shell resource now owns the read-merge-patch cycle; the service is effectively unused and should be deleted (or rewritten) in story 007.
- 002 folded the `client.ts` rewiring into this task because `createOrganizationsResource` now takes 4 args — task 003's scope narrowed to just the `ShellAppProvider` on-enter effect to keep per-task typecheck green.
- 003 pinned `repositories` via `useRef` inside `ShellAppProvider` so the on-enter effect keys only on `{orgSlug, projectId, currentUserId}`; testing caught that a fresh `value` object on every render would have re-fired the write on unchanged navigation.

## Questions surfaced

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
