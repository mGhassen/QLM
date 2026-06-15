---
story: ./story.md
status: done
layer: tests
model: sonnet
files:
  - packages/domain/__tests__/entities/user-preferences.test.ts
  - packages/domain/__tests__/services/user-preferences/get-last-project.test.ts
  - packages/domain/__tests__/services/user-preferences/set-last-project.test.ts
  - packages/domain/__tests__/services/user-preferences/merge-preferences.test.ts
validation:
  kind: domain-test
  specs:
    - packages/domain/__tests__/entities/user-preferences.test.ts
    - packages/domain/__tests__/services/user-preferences/get-last-project.test.ts
    - packages/domain/__tests__/services/user-preferences/set-last-project.test.ts
    - packages/domain/__tests__/services/user-preferences/merge-preferences.test.ts
---

# Add domain-level unit tests for user preferences

Cover the spec §10.2 bullets for `packages/domain`: schema parse/reject, `GetLastProjectService` fallback, `SetLastProjectService` patch shape, merge-helper sibling preservation.

## Done when

- [ ] `UserPreferencesSchema` tests assert valid payload parses and invalid payload (wrong type for project id) rejects.
- [ ] `GetLastProjectService` tests cover: key present & project exists, key present & project deleted, key missing.
- [ ] `SetLastProjectService` test asserts the exact JSON patch shape it produces.
- [ ] Merge-helper test asserts sibling keys are preserved when patching.
- [ ] `pnpm --filter @qlm/domain test -- __tests__/entities/user-preferences.test.ts __tests__/services/user-preferences/*.test.ts` green.

## Notes

- Use plain object mocks for `IUserPreferencesRepository` / `IProjectRepository` — no library mocks.
- If the merge helper lives under a shared utils path (not a standalone service), point the test at the helper module directly.
