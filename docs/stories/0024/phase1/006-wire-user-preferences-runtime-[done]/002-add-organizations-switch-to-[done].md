---
story: ./story.md
status: done
layer: shell
model: sonnet
files:
  - packages/shell-runtime/src/resources/organizations.ts
  - packages/shell-runtime/src/client.ts
  - packages/shell-runtime/__tests__/resources/organizations.test.ts
validation:
  kind: typecheck-only
---

# Add organizations.switchTo resolving the last project

Extend `createOrganizationsResource` with `switchTo(orgId)` that resolves the target org's last-used project (via the user-preferences resource from task 001), falls back to the org's first project when there's no recorded entry, and returns `{ slug }` for the caller to navigate. Keeps `shell-runtime` router-agnostic — story 008 wires the actual `router.navigate`.

## Done when

- [ ] `createOrganizationsResource` accepts an additional dependency (the user-preferences resource and project repository, or a narrowly-typed resolver) so `switchTo` can reach both without importing from the client module — avoid circular imports.
- [ ] `switchTo(orgId: string): Promise<{ slug: string }>`:
  - Calls `userPreferencesResource.getLastProject(orgId)`.
  - If a project id is returned, looks up its slug via `projectRepository.findById(id)`.
  - If null, falls back to the first project from `projectRepository.findAllByOrganizationId(orgId)` and uses its slug.
  - Throws a domain-style error if the org has zero projects — caller shows a "create first project" prompt (out of scope here).
- [ ] Unit test covers: switchTo resolves last project slug, falls back to first project when no last entry, falls back when the stored id 404s, throws when the org has no projects.
- [ ] `client.ts` constructs `createUserPreferencesResource(repositories.userPreferences, repositories.project, queryClient, currentUserId)` and threads it into `createOrganizationsResource` as the `lastProjectResolver`. `ShellClient` gains `userPreferences: UserPreferencesResource`. Must land in the same commit — the 4-arg `createOrganizationsResource` signature breaks the old call site otherwise.
- [ ] `pnpm typecheck` green.
- [ ] `pnpm --filter @qlm/shell-runtime test` green.

## Notes

- Don't navigate inside the resource — the returned `{ slug }` is the contract boundary. Introducing a `NavigateFn` injection is deferred until a second caller appears (YAGNI).
- Accept a minimal structural `LastProjectResolver = { getLastProject(orgId): Promise<string | null> }` — no circular-import risk, and the organizations resource doesn't need the rest of the user-preferences surface.
- The `ShellAppProvider` on-enter write effect belongs to task 003.
