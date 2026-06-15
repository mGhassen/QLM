---
story: ./story.md
status: done
layer: adapter
model: sonnet
files:
  - packages/domain/src/repositories/account-repository.port.ts
  - packages/domain/src/services/personal-account/upload-avatar.usecase.ts
  - packages/domain/src/services/personal-account/clear-avatar.usecase.ts
  - packages/domain/src/services/personal-account/dtos.ts
  - packages/domain/src/services/personal-account/index.ts
  - packages/domain/__tests__/services/personal-account/upload-avatar.test.ts
  - packages/domain/__tests__/services/personal-account/clear-avatar.test.ts
  - packages/repositories/supabase/src/personal-account.repository.ts
  - packages/shell-runtime/src/resources/personal-account.ts
  - apps/web/src/lib/i18n/locales/en/user-profile.json
validation:
  kind: domain-test
  specs:
    - packages/domain/__tests__/services/personal-account/upload-avatar.test.ts
    - packages/domain/__tests__/services/personal-account/clear-avatar.test.ts
---

# Wire avatar upload spine

Extend the existing `IAccountRepository` port with `uploadAvatar(userId, file) → PersonalAccount` and `clearAvatar(userId) → PersonalAccount`, the matching Supabase adapter, two domain services, and the runtime resource methods. No UI change in this task.

## Done when

- [ ] `IAccountRepository.uploadAvatar(userId, file)` and `IAccountRepository.clearAvatar(userId)` declared on the port.
- [ ] `UploadAvatarService` and `ClearAvatarService` exist with happy-path + invalid-file domain tests.
- [ ] `SupabasePersonalAccountRepository`:
  - `uploadAvatar` uploads to `account_image` bucket at `{userId}.{ext}?v={nanoid}`, removes the previous file if any, gets a public URL, and updates `accounts.picture_url`.
  - `clearAvatar` removes the existing object (if any) and sets `picture_url = null`.
- [ ] `shell.personalAccount.uploadAvatar(file)` and `clearAvatar()` exposed; both invalidate the shared `['personal-account', userId]` query key.
- [ ] i18n keys added under `userProfile.picture.*`: `clear`, `updating`, `updated`, `error`.
- [ ] `pnpm --filter @qlm/domain test` passes; `pnpm typecheck` passes monorepo-wide.

## Notes

- Storage RLS already in place (`account_image` policy via `get_storage_filename_as_uuid`). No schema or RLS change in this task.
- `nanoid` is already a workspace dep (used by user-token).
- Spec anchors: [§4.1 SD-2](../../../specs/0025-user-profile-phase1.md#41-layered-sequence-diagrams), [§7.1 Domain](../../../specs/0025-user-profile-phase1.md#71-domain-packagesdomain).
