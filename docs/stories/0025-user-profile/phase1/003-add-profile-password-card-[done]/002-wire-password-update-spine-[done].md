---
story: ./story.md
status: done
layer: adapter
model: sonnet
files:
  - packages/domain/src/repositories/account-repository.port.ts
  - packages/domain/src/services/personal-account/update-password.usecase.ts
  - packages/domain/src/services/personal-account/dtos.ts
  - packages/domain/src/services/personal-account/index.ts
  - packages/domain/__tests__/services/personal-account/update-password.test.ts
  - packages/domain/src/exceptions/invalid-current-password.exception.ts
  - packages/domain/src/exceptions/index.ts
  - packages/domain/src/common/code.ts
  - packages/repositories/supabase/src/personal-account.repository.ts
  - packages/shell-runtime/src/resources/personal-account.ts
  - apps/web/src/lib/i18n/locales/en/user-profile.json
validation:
  kind: domain-test
  specs:
    - packages/domain/__tests__/services/personal-account/update-password.test.ts
---

# Wire password update spine

Extend the existing `IAccountRepository` port with `updatePassword({sessionEmail, current, next})`. Domain service re-auths via `signInWithPassword` first, then updates. Adapter delegates to Supabase auth. No UI change.

## Done when

- [ ] `IAccountRepository.updatePassword({sessionEmail, current, next}) → Promise<void>` declared on the port.
- [ ] `UpdatePasswordService` calls the repo and surfaces `InvalidCurrentPasswordException` (code 3101) on wrong-current; happy-path resolves void.
- [ ] `UpdatePasswordInputSchema`: `{sessionEmail: email, current: min(1), next: min(8)}`. Reject identical current+next inputs (`InvalidProfileInputException`).
- [ ] `SupabasePersonalAccountRepository.updatePassword`: `auth.signInWithPassword({email: sessionEmail, password: current})` → on failure throw `InvalidCurrentPasswordException`; on success `auth.updateUser({password: next})`.
- [ ] `shell.personalAccount.updatePassword({current, next})` exposed; reads the session's email from the runtime context to satisfy `sessionEmail`.
- [ ] i18n keys added: `userProfile.password.{updated,invalidCurrent,sameAsCurrent,tooShort}`.
- [ ] `pnpm --filter @qlm/domain test` passes; `pnpm typecheck` passes monorepo-wide.

## Notes

- The shell-runtime needs the session email to call signInWithPassword. The shell context already exposes `currentUserId` — extend it (or use `useUser()` indirectly via the existing supabase hooks) to also provide email. If the shell context doesn't carry email yet, accept `email` as a runtime-resource argument and pass it from the caller.
- No new RLS or schema changes — auth.users mutation goes through Supabase auth API.
- Spec anchors: [§4.1 SD-4](../../../specs/0025-user-profile-phase1.md#41-layered-sequence-diagrams), [§9 security checklist re-auth](../../../specs/0025-user-profile-phase1.md#9-security-checklist).
