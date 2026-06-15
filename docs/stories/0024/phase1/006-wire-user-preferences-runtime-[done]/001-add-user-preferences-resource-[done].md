---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - packages/shell-runtime/package.json
  - packages/shell-runtime/vitest.config.ts
  - packages/shell-runtime/src/resources/user-preferences.ts
  - packages/shell-runtime/__tests__/resources/user-preferences.test.ts
  - pnpm-lock.yaml
validation:
  kind: typecheck-only
---

# Add user-preferences shell-runtime resource

Scaffold vitest in `@guepard/shell-runtime` (it has none today) and add a `createUserPreferencesResource(repo, projectRepo, queryClient)` that exposes `getLastProject`, `setLastProject`, `mergePreferences` with React Query keys + invalidation. `setLastProject` does an in-memory read-merge-patch of `last_project_by_org` because postgres `jsonb ||` is shallow and a one-key patch would clobber other orgs' entries (see story 005 notes).

## Done when

- [ ] `packages/shell-runtime/package.json` gains `"test": "vitest run --logHeapUsage --coverage --silent --passWithNoTests"`, `"test:watch": "vitest"`, and `devDependencies` for `vitest`, `@vitest/coverage-istanbul`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` — mirror versions from `packages/features/accounts` to stay on the workspace catalog.
- [ ] `vitest.config.ts` uses jsdom env and includes `__tests__/**/*.test.ts(x)`.
- [ ] `createUserPreferencesResource` exports:
  - `keys = { root: ['user-preferences'] as const }`
  - `async getLastProject(orgId)` — calls `GetLastProjectService(repo).execute({ userId: currentUserId, organizationId: orgId })`; if null, resolves via `IProjectRepository.findAllByOrganizationId(orgId)` + picks the first project's id; returns `null` if that list is empty.
  - `async setLastProject(orgId, projectId)` — reads the current row via `repo.get(userId)` (null → `{}`), merges `{ [orgId]: projectId }` into `last_project_by_org`, calls `repo.patch(userId, { last_project_by_org: merged })`; invalidates `keys.root`.
  - `async mergePreferences(patch)` — thin: validates with `UserPreferencesPayloadSchema.partial().passthrough()`, calls `repo.patch(userId, patch)`; invalidates `keys.root`.
  - `invalidate.root`.
- [ ] Unit test covers: `setLastProject` preserves an existing org's entry when adding a new one; `getLastProject` returns the stored id; `getLastProject` falls back to the org's first project when the map has no entry; `mergePreferences` rejects invalid payloads.
- [ ] `pnpm typecheck` green.
- [ ] `pnpm --filter @guepard/shell-runtime test` green.

## Notes

- Take `currentUserId` as a constructor parameter — the HTTP adapter ignores it but the interface still requires a string. Use the value wired via `useShellApp()` in task 003.
- Don't introduce a `UserPreferencesResource` class — match the existing `createNotebooksResource` factory pattern.
- The shallow-merge rationale belongs in a 1-line JSDoc on `setLastProject`, not in an inline comment in the body.
