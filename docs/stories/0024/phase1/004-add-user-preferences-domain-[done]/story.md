---
spec: docs/specs/0024-global-shell-ui-phase1.md
spec_sections:
  - "#62-config--payload-contracts"
  - "#71-domain-packagesdomain"
started: 2026-04-18
finished: 2026-04-18
status: done
blocks:
  - "005-implement-user-preferences-api"
  - "006-wire-user-preferences-runtime"
blocked_by:
  - "003-add-user-preferences-table"
---

# Add user_preferences domain

## Goal

Define the domain entity, Zod schema, repository port, and two services (`GetLastProject`, `SetLastProject`) so adapters and the runtime have a typed contract to implement.

## Scope

**In scope**
- `packages/domain/src/entities/user-preferences.type.ts` — entity + `UserPreferencesSchema` per spec §6.2.
- `packages/domain/src/repositories/user-preferences.port.ts` — abstract port with `get(userId)` and `patch(userId, patch)`.
- `packages/domain/src/services/user-preferences/get-last-project.usecase.ts` — resolves `last_project_by_org[orgId]`, falls back to the org's default project when unset or pointing at a deleted project.
- `packages/domain/src/services/user-preferences/set-last-project.usecase.ts` — merges `{ last_project_by_org: { [orgId]: projectId } }` into the existing prefs.
- Domain unit tests (happy + fallback + malformed payload branches).
- Re-exports added to `packages/domain/src/index.ts`.

**Out of scope**
- Adapter implementations (story 005).
- Any shell-runtime / React consumers (story 006).

## Acceptance criteria

- [x] `pnpm --filter @qlm/domain test` passes with unit tests covering: valid parse, invalid parse (non-uuid values), missing `last_project_by_org` → fallback, project-not-found → fallback.
- [x] Port is an **abstract class** consistent with existing ports in `packages/domain/src/repositories/*.port.ts`.
- [x] Services take the repository via constructor injection; no concrete adapter imported.
- [x] `pnpm typecheck` green across the monorepo.

## Tasks

1. [001-add-user-preferences-domain-code](001-add-user-preferences-domain-code-[done].md)

## Demo / verification

```
pnpm --filter @qlm/domain test -- __tests__/services/user-preferences
pnpm typecheck
```

Expect: all branches green; `GetLastProjectService` returns the org default when the preferences blob is `{}`.

## Questions surfaced

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
