---
story: ./story.md
status: done
layer: adapter
model: sonnet
files:
  - packages/domain/src/entities/personal-account.type.ts
  - packages/domain/src/repositories/account-repository.port.ts
  - packages/domain/src/repositories/repositories.ts
  - packages/domain/src/repositories/index.ts
  - packages/domain/src/services/personal-account/get-mine.usecase.ts
  - packages/domain/src/services/personal-account/update-mine.usecase.ts
  - packages/domain/src/services/personal-account/dtos.ts
  - packages/domain/src/services/index.ts
  - packages/domain/src/exceptions/invalid-profile-input.exception.ts
  - packages/domain/src/exceptions/index.ts
  - packages/domain/__tests__/services/personal-account/get-mine.test.ts
  - packages/domain/__tests__/services/personal-account/update-mine.test.ts
  - packages/repositories/supabase/src/personal-account.repository.ts
  - packages/repositories/supabase/src/index.ts
  - packages/shell-runtime/src/resources/personal-account.ts
  - packages/shell-runtime/src/create-shell.ts
  - apps/web/src/lib/repositories-factory.ts
  - packages/i18n/src/locales/en/user-profile.json
  - packages/i18n/src/locales/fr/user-profile.json
  - packages/i18n/src/index.ts
validation:
  kind: domain-test
  specs:
    - packages/domain/__tests__/services/personal-account/get-mine.test.ts
    - packages/domain/__tests__/services/personal-account/update-mine.test.ts
---

# Wire personal account data spine

Introduce the `IAccountRepository` port, Supabase adapter, `shell.personalAccount.*` runtime resource, factory wiring, and the `userProfile` i18n namespace seed — everything the Name card needs to start persisting. No UI change in this task.

## Done when

- [ ] `PersonalAccountSchema` + `IAccountRepository` port (`getMine`, `updateMine`) live in `packages/domain`; `Repositories` type gains a `personalAccount` slot.
- [ ] `GetPersonalAccountService` + `UpdatePersonalAccountService` exist with domain tests covering happy path, empty-name rejection (`InvalidProfileInputException`), and unknown-user.
- [ ] `PersonalAccountRepository` in `packages/repositories/supabase` implements `getMine` + `updateMine` against the `accounts` table.
- [ ] `apps/web/src/lib/repositories-factory.ts` constructs `PersonalAccountRepository` and includes it in the `Repositories` bag.
- [ ] `shell.personalAccount.getMine()` + `updateMine({ name?, pictureUrl? })` + `invalidate.mine()` exposed, backed by shared query key `['personal-account', userId]`.
- [ ] `packages/i18n` ships `userProfile.sectionTitle`, `userProfile.name.{title,description,label,submit,updated,required}` with English + French defaults.
- [ ] `pnpm --filter @guepard/domain test` passes; `pnpm typecheck` passes across the monorepo.

## Notes

- No React, no HTTP, no Supabase in `packages/domain` — pure TS per `@.claude/rules/hexagonal-architecture.md`.
- `picture_url` / `updatePassword` signatures are placeholders for stories 002/003; do not implement them here.
- Spec anchors: [§4.1 SD-1](../../../specs/0025-user-profile-phase1.md#41-layered-sequence-diagrams), [§7 work items](../../../specs/0025-user-profile-phase1.md#7-file-by-file-work-items).
