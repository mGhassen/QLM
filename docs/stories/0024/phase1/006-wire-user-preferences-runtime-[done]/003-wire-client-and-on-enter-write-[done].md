---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - packages/shell-runtime/src/context.tsx
  - packages/shell-runtime/__tests__/context.test.tsx
  - packages/shell-runtime/package.json
  - pnpm-lock.yaml
validation:
  kind: typecheck-only
---

# Fire-and-forget on-enter last-project write

Inside `ShellAppProvider`, fire a best-effort `setLastProject(orgSlug, projectId)` on mount and whenever the `{orgSlug, projectId}` pair changes. Errors are logged, never thrown — the UX must not block render because of a preference write. (Client-side wiring of `shell.userPreferences` landed in task 002 alongside the organizations 4-arg signature change.)

## Done when

- [ ] `ShellAppProvider` uses `useEffect` to call `setLastProject(orgSlug, projectId)` once per mount and whenever either key changes. Errors caught → `@qlm/shared/logger`.warn; never rethrown.
- [ ] Test: render `ShellAppProvider` with a spy `patch`; assert a single call after mount with the expected `{ last_project_by_org: { [orgSlug]: projectId } }`; re-render with an unchanged pair → no additional calls; re-render with a new projectId → one additional call.
- [ ] Test: when `patch` rejects, no error surfaces to the tree and logger.warn is called.
- [ ] `pnpm typecheck` green.
- [ ] `pnpm --filter @qlm/shell-runtime test` green.

## Notes

- The effect's deps are `[orgSlug, projectId]` — if either is empty string, skip the write (no project context = nothing to record).
- `@qlm/shared/logger` is async (pino under the hood); use `void (async () => { … })()` if needed to keep the effect synchronous.
- Keep the effect inside `ShellAppProvider` rather than `useShell()` — the hook can run on many subscribers, the provider mounts once per route.
