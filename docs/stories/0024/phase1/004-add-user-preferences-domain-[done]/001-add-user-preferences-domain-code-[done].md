---
story: ./story.md
status: done
layer: domain
model: sonnet
files:
  - packages/domain/src/entities/user-preferences.type.ts
  - packages/domain/src/repositories/user-preferences.port.ts
  - packages/domain/src/services/user-preferences/get-last-project.usecase.ts
  - packages/domain/src/services/user-preferences/set-last-project.usecase.ts
  - packages/domain/src/services/user-preferences/index.ts
  - packages/domain/src/index.ts
  - packages/domain/src/repositories/index.ts
  - packages/domain/src/entities/index.ts
  - packages/domain/__tests__/services/user-preferences/get-last-project.test.ts
  - packages/domain/__tests__/services/user-preferences/set-last-project.test.ts
  - packages/domain/__tests__/services/user-preferences/mocks.ts
validation:
  kind: domain-test
  specs:
    - packages/domain/__tests__/services/user-preferences/get-last-project.test.ts
    - packages/domain/__tests__/services/user-preferences/set-last-project.test.ts
---

# Add user_preferences domain (entity + port + services + tests)

Ship the pure-domain contract for per-user preferences so stories 005 (adapter + server) and 006 (runtime) have a typed target.

## Done when

- [x] `UserPreferencesSchema` defined in `packages/domain/src/entities/user-preferences.type.ts`; shape matches spec §6.2 (`last_project_by_org: Record<uuid, uuid>` + `.passthrough()` for future fields).
- [x] `IUserPreferencesRepository` abstract class in `packages/domain/src/repositories/user-preferences.port.ts` with `get(userId)` and `patch(userId, patch)` methods.
- [x] `GetLastProjectService` resolves `last_project_by_org[orgId]`; falls back to `null` when unset.
- [x] `SetLastProjectService` produces the patch `{ last_project_by_org: { [orgId]: projectId } }` and calls `repo.patch`.
- [x] Unit tests cover: valid parse, invalid parse (non-uuid), missing `last_project_by_org` → null fallback, partial patch preserves sibling keys.
- [x] Domain tests green via `pnpm --filter @qlm/domain test`.
- [x] Monorepo-wide `pnpm typecheck` green.

## Notes

- Fallback-to-default-project resolution belongs in the shell-runtime (story 006) because it needs `projectRepository.findDefaultByOrg()`; domain just returns `null` when the pref is absent.
- Mirror the pattern of `packages/domain/src/repositories/project.port.ts` for the abstract class shape.
