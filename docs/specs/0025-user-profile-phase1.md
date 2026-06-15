# Spec — User profile (phase 1)

| Field        | Value                                                              |
| ------------ | ------------------------------------------------------------------ |
| Status       | Shipped — 2026-04-29                                               |
| Author       | Hani Chalouati                                                     |
| Created      | 2026-04-23                                                         |
| Implements   | [RFC 0025 — User profile](../rfcs/0025-user-profile.md)            |
| Target phase | Phase 1                                                            |
| Stories      | [`docs/stories/0025-user-profile/phase1/`](../stories/0025-user-profile/phase1/) |

This document is the implementation spec for RFC 0025. The RFC establishes the *why* and *shape*; this spec defines the *what* and *how*: resolved open questions, exact data shapes, API contracts, functional flows, file-by-file work items, and a verification plan.

Scope is strict to phase 1. Everything out of scope is deferred to its own phase and does not appear here.

---

## 1. Resolved open questions

One row per question from the RFC's open-questions section. Every question is resolved here — no "TBD" rows survive into the spec.

| # | Question | Resolution for phase 1 |
| - | -------- | ---------------------- |
| 1 | Do we surface the avatar in the shell topbar immediately after upload, or on next navigation? | Use a shared React Query key `['personal-account', userId]` consumed by both `shell.personalAccount.getMine()` and the existing topbar avatar component. Every `updateMine` / `uploadAvatar` / `clearAvatar` mutation invalidates this key so Profile and topbar refresh together. |
| 2 | Does the Password card need re-auth on render, or only on submit? | On submit only. The existing `UpdatePasswordForm` gains a `currentPassword` field; the adapter performs `auth.signInWithPassword` with the session email + supplied current password immediately before `auth.updateUser({ password: new })`. No extra prompt on render. |
| 3 | What is the exact copy for the "account not linked" banner and its i18n key namespace? | Namespace `userProfile.password.noIdentityLinked`. English default matches the mockup verbatim: *"You cannot update your password because your account is not linked to any."* Other locales deferred to a standard i18n follow-up. |

## 2. User stories

- As a signed-in user, I can open **Settings → Profile** and see my current display name, avatar, password form (or a not-linked notice), and MFA factor list — all on one page, with Profile rendered above Personal tokens in the sidebar.
- As a signed-in user, I can update my **display name** and see the new value in the topbar and user menu without a page reload.
- As a signed-in user, I can **upload a new profile picture** or **clear the existing one** back to initials, with the change reflected immediately wherever my avatar is shown.
- As a signed-in user with an email identity, I can **update my password** by entering my current password and a new one; if I signed up with OAuth only, I see a notice instead of the form.
- As a signed-in user, I can **enroll a TOTP factor** via QR code + 6-digit verification, see it in my factor list, and **unenroll a factor** by re-entering my current password.

## 3. Functional flow

### 3.1 Information architecture

- **Host app**: `packages/apps/user-settings` (`layer: project`, `routeBase: user-settings`, nav slot `project.overflow`, manifest order 110).
- **URL**: `/prj/{projectSlug}/user-settings` — the existing route. No new route registered.
- **Sidebar ordering** (inside `SettingsSidebar`): **Profile** (new) → **Personal tokens** (existing) → future sections.
- **Default section**: Profile is the default landing section when the URL has no sidebar hash.
- **Topbar coupling**: the user-menu avatar + display name in `packages/ui/src/guepard/shell/shell-user-profile-menu.tsx` read from the same React Query key as Profile (open-question #1).

### 3.2 Screen-by-screen

#### 3.2.1 Profile section (`/prj/{slug}/user-settings`, sidebar = Profile)

Layout: vertical stack of four `Card` primitives from `@guepard/ui/card`, matching `docs/rfcs/0025-user-profile/user-profile.png`.

| # | Card | Components | Loading | Empty | Error |
| - | ---- | ---------- | ------- | ----- | ----- |
| 1 | **Your Profile Picture** | `ImageUploader` + `ProfileAvatar` fallback (initials) | Skeleton in the uploader slot | Initials shown when `picture_url` is null | Toast: *Could not update profile* |
| 2 | **Your Name** | RHF form with one `Input` + *Update Profile* submit | Disabled input + skeleton | — | Inline `FormMessage` on validation; toast on adapter error |
| 3 | **Update your Password** | Existing `UpdatePasswordForm` + new `currentPassword` field | Disabled form + skeleton | Warning banner *"You cannot update your password because your account is not linked to any."* when `isProviderConnected('email') === false` | Inline error for wrong current password; toast for network/server error |
| 4 | **Multi-Factor Authentication** | `MultiFactorAuthFactorsList` (new) + *Setup a new Factor* button opening `MultiFactorAuthSetupDialog` (new) | Skeleton list | Callout *"Secure your account with Multi-Factor Authentication"* with active CTA | Alert inside dialog keyed by `auth:errors.<code>` |

#### 3.2.2 MFA setup dialog (modal)

Three-step flow inside a `Dialog` with `onInteractOutside` / `onEscapeKeyDown` suppressed while mid-flow:

1. **Factor name** — `Input` (friendly name, required min 1). Cancel / Continue.
2. **QR + manual secret** — rendered `img` of `totp.qr_code` returned by `auth.mfa.enroll`, plus the manual-entry string in monospace. Cancel / Continue.
3. **Verify OTP** — 6-digit `InputOTP`. Cancel / Enable Factor. On success: session refresh + toast *"MFA enabled"* + dialog close + factor list refetch.

### 3.3 User flows (happy paths)

**F1 — Update display name**
1. User types a new name into the Name card input.
2. Clicks *Update Profile*.
3. `shell.personalAccount.updateMine({ name })` invalidates `['personal-account', userId]`.
4. Topbar and Name card re-render with the new value. Toast: *Profile updated*.

**F2 — Upload avatar**
1. User selects a file via `ImageUploader`.
2. Client calls `shell.personalAccount.uploadAvatar(file)`.
3. Adapter deletes any existing file in `account_image` bucket, uploads the new one at `{userId}.{ext}?v={nanoid}`, obtains the public URL, and writes `accounts.picture_url`.
4. Mutation invalidates `['personal-account', userId]`. Avatar appears in Profile + topbar. Toast: *Profile updated*.

**F3 — Clear avatar**
1. User clicks *Clear* on the Picture card.
2. Client calls `shell.personalAccount.clearAvatar()`.
3. Adapter deletes the file in the bucket and sets `accounts.picture_url = null`.
4. Mutation invalidates the shared key. Initials fallback appears. Toast: *Profile updated*.

**F4 — Update password (email identity)**
1. User enters current password, new password, and confirm new password.
2. Submit → `shell.personalAccount.updatePassword({ current, next })`.
3. Adapter calls `auth.signInWithPassword({ email, password: current })` against the session email; if it fails, throws `InvalidCurrentPasswordException`.
4. On success, calls `auth.updateUser({ password: next })`. Toast: *Password updated*.

**F5 — Enroll TOTP factor**
1. User clicks *Setup a new Factor*.
2. Dialog step 1: enter friendly name.
3. Adapter `enrollTotp(friendlyName)` → factor id + QR data URI returned.
4. Dialog step 2: show QR + manual secret. User scans / pastes into authenticator app.
5. Dialog step 3: user enters 6-digit code.
6. Adapter `challenge(factorId)` → `challengeId`; adapter `verify({ factorId, challengeId, code })`.
7. On verify success: `auth.refreshSession()`, dialog closes, factor list invalidates. Toast: *MFA enabled*.

**F6 — Unenroll factor**
1. User clicks the remove affordance on a factor row.
2. Confirmation prompts for current password.
3. Adapter re-auths via `auth.signInWithPassword` then calls `auth.mfa.unenroll({ factorId })`.
4. Factor list invalidates. Toast: *Factor removed*.

### 3.4 Error and edge-case behaviour

| Condition | Behaviour |
| --- | --- |
| Avatar upload: file > 2 MB or wrong MIME | Client-side rejection in `ImageUploader`, inline error, no network call. |
| Avatar upload: Storage RLS rejects (wrong user id in path) | Should never happen — path is constructed from the session user id. If it does: toast *Could not update profile*, keep previous avatar. |
| Avatar clear: previous file already missing | Adapter swallows `object not found` from Storage and proceeds to set `picture_url = null`. |
| Display name: empty string | Domain rejects with `InvalidNameException`; inline `FormMessage`. |
| Password: wrong current password | `InvalidCurrentPasswordException`; inline error on `currentPassword` field. Do not call `auth.updateUser`. |
| Password: user is OAuth-only (`isProviderConnected('email') === false`) | Render warning banner instead of form. No submit affordance. |
| MFA enroll: user cancels mid-dialog | Dialog calls `auth.mfa.unenroll(factorId)` on the pending factor if one was created, so no dangling enrollment. |
| MFA verify: wrong OTP | `auth:errors.invalid_otp`; stay on step 3; allow retry. |
| MFA unenroll: wrong current password | `InvalidCurrentPasswordException`; keep factor active. |
| Any mutation: offline / 5xx | Toast with a generic i18n key `common.errors.generic`; no partial state in the UI (mutations are atomic per card). |

## 4. Technical flow

### 4.1 Layered sequence diagrams

**SD-1 — Update display name**

```
User → (Name card onSubmit)
  → shell.personalAccount.updateMine({ name })
    → new UpdatePersonalAccountService(repo).execute({ userId, name })
      → IAccountRepository.updateMine({ userId, name })
        → Supabase adapter: UPDATE accounts SET name WHERE user_id = auth.uid()
      ← Account entity
    ← PersonalAccountOutput
  ← Promise<PersonalAccountOutput>
User → Query invalidates ['personal-account', userId]
  → Topbar + Name card refetch
```

**SD-2 — Upload avatar**

```
User → (ImageUploader onValueChange(file))
  → shell.personalAccount.uploadAvatar(file)
    → new UploadAvatarService(repo).execute({ userId, file })
      → IAccountRepository.uploadAvatar({ userId, file })
        → Supabase adapter:
            1. storage.from('account_image').remove([existingPath])  (if picture_url exists)
            2. storage.from('account_image').upload(`${userId}.${ext}?v=${nanoid()}`, bytes)
            3. storage.from('account_image').getPublicUrl(path) → publicUrl
            4. UPDATE accounts SET picture_url = publicUrl WHERE user_id = auth.uid()
      ← Account entity with new picture_url
    ← PersonalAccountOutput
  ← Promise<PersonalAccountOutput>
User → Query invalidates ['personal-account', userId]
```

**SD-3 — Enroll + verify TOTP**

```
User → (Setup dialog step 1 submit)
  → shell.mfa.enrollTotp(friendlyName)
    → IMfaRepository.enrollTotp(friendlyName) → client.auth.mfa.enroll({ factorType: 'totp', friendlyName })
    ← { id, totp: { qr_code, secret } }
User → (sees QR, enters OTP in step 3)
  → shell.mfa.verify({ factorId, code })
    → new VerifyMfaFactorService(repo).execute(...)
      → IMfaRepository.challenge(factorId) → { challengeId }
      → IMfaRepository.verify({ factorId, challengeId, code }) → session
    ← Ok
  → client.auth.refreshSession()
User → Query invalidates ['mfa-factors', userId]; toast success
```

**SD-4 — Update password (with current-password re-auth)**

```
User → (Password card onSubmit: { currentPassword, newPassword })
  → shell.personalAccount.updatePassword({ current, next })
    → new UpdatePasswordService(userRepo, sessionEmail).execute(...)
      → IUserRepository (or inline hook): client.auth.signInWithPassword({ email: sessionEmail, password: current })
        ← throws InvalidCurrentPasswordException on fail
      → client.auth.updateUser({ password: next })
    ← Ok
  ← void
User → Toast: "Password updated"
```

### 4.2 Component split

| Code | Location | Role |
| --- | -------- | ---- |
| `IAccountRepository`, `IMfaRepository`, DTOs, services, exceptions | `packages/domain/src/repositories/*` + `packages/domain/src/services/personal-account/*` + `packages/domain/src/services/mfa/*` | Pure domain. No React, no HTTP. |
| Supabase adapters | `packages/repositories/supabase/src/personal-account.repository.ts` + `mfa.repository.ts` | Concrete implementations; call `client.auth.*`, `client.storage.*`, `client.from('accounts')`. |
| Shell runtime resources | `packages/shell-runtime/src/resources/personal-account.ts` + `mfa.ts` | Typed promise-based client consumed via `useShell()`. |
| `UserProfileSectionUI`, `NameCard`, `PictureCard`, `PasswordCard`, `MfaCard`, `MultiFactorAuthSetupDialog`, `MultiFactorAuthFactorsList` | `packages/features/user-profile/src/*` | Pure presentation. Props in, callbacks out. No repository access. |
| Section registration + `useShell()` wiring | `packages/apps/user-settings/src/sections/profile.tsx` | Hosts the feature components, wires React Query mutations to `shell.*` calls. |
| Repositories factory wiring | `apps/web/src/lib/repositories-factory.ts` | Constructs the two new adapters and provides them via `WorkspaceContext`. |

## 5. API contracts

### 5.1 Data shapes

```ts
// packages/domain/src/entities/personal-account.type.ts
export const PersonalAccountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email().nullable(),
  pictureUrl: z.string().url().nullable(),
  updatedAt: z.string().datetime().nullable(),
});
export type PersonalAccount = z.infer<typeof PersonalAccountSchema>;

// packages/domain/src/services/personal-account/dtos.ts
export const UpdatePersonalAccountInputSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  pictureUrl: z.string().url().nullable().optional(),
});
export type UpdatePersonalAccountInput = z.infer<typeof UpdatePersonalAccountInputSchema>;

export const UploadAvatarInputSchema = z.object({
  userId: z.string().uuid(),
  file: z.instanceof(File),
});

// packages/domain/src/entities/mfa-factor.type.ts
export const MfaFactorSchema = z.object({
  id: z.string().uuid(),
  friendlyName: z.string().min(1),
  factorType: z.literal('totp'),
  status: z.enum(['unverified', 'verified']),
  createdAt: z.string().datetime(),
});
export type MfaFactor = z.infer<typeof MfaFactorSchema>;

export const EnrollTotpOutputSchema = z.object({
  id: z.string().uuid(),
  totp: z.object({
    qrCode: z.string(),      // data URI
    secret: z.string(),
    uri: z.string(),
  }),
});
```

### 5.2 Endpoints

Phase 1 introduces **no new HTTP endpoints**. All persistence goes through Supabase client calls inside the adapter:

| Operation | Supabase call |
| --- | --- |
| Read profile | `client.from('accounts').select('*').eq('user_id', userId).single()` |
| Update name / picture_url | `client.from('accounts').update({...}).eq('user_id', userId)` |
| Upload avatar | `client.storage.from('account_image').upload(path, bytes)` + `getPublicUrl(path)` |
| Delete avatar file | `client.storage.from('account_image').remove([path])` |
| Re-auth | `client.auth.signInWithPassword({ email, password })` |
| Update password | `client.auth.updateUser({ password })` |
| List factors | `client.auth.mfa.listFactors()` |
| Enroll TOTP | `client.auth.mfa.enroll({ factorType: 'totp', friendlyName })` |
| Challenge factor | `client.auth.mfa.challenge({ factorId })` |
| Verify factor | `client.auth.mfa.verify({ factorId, challengeId, code })` |
| Unenroll factor | `client.auth.mfa.unenroll({ factorId })` |
| Refresh session | `client.auth.refreshSession()` |

### 5.3 Rate limiting, pagination, caching

- **Rate limiting**: none added by this phase. Password re-auth relies on the existing Supabase auth throttle (CC6.6). RFC 0017 owns future per-account rate limits.
- **Pagination**: not applicable — one account per user, small factor list.
- **Caching**: React Query with `staleTime: 60_000` on `['personal-account', userId]` and `['mfa-factors', userId]`. All mutations invalidate their shared key so the topbar and Profile view stay in lockstep (open-question #1).

## 6. Data model

### 6.1 Schema

**No new tables, no new columns, no new indexes, no new migrations.** Phase 1 sits entirely on existing schema:

- `public.accounts` — `04-initial-tables.sql` — columns `name`, `picture_url` already present.
- `auth.users` — Supabase-owned.
- `auth.mfa_factors` — Supabase-owned.
- `storage.buckets` — `account_image` bucket from `19-storage.sql`.

Any attempt to add a schema file under `apps/web/supabase/schemas/` during implementation is a sign of scope creep — push it to phase 2 or a separate RFC.

### 6.2 Config / payload contracts

Not applicable — no `jsonb` surfaces introduced.

### 6.3 Secrets contract

- **No new secrets** are introduced. The adapter uses the existing browser Supabase client (anon key) for all operations.
- **TOTP secret** is ephemeral: returned by `auth.mfa.enroll`, rendered once inside the setup dialog, never persisted by the client.
- **Current password** (for re-auth) is held in RHF state for the duration of submit only; never logged. Pino redact rules already cover `password`.
- `ISecretVault` is not involved in phase 1.

## 7. File-by-file work items

Grouped by hexagonal layer, top-down. Each subsection lists concrete files and the change each one makes. `/spec-to-stories` reads this section to derive stories.

### 7.1 Domain (`packages/domain`)

- **New** `src/entities/personal-account.type.ts` — `PersonalAccountSchema` + type.
- **New** `src/entities/mfa-factor.type.ts` — `MfaFactorSchema` + `EnrollTotpOutputSchema` + types.
- **New** `src/repositories/account-repository.port.ts` — abstract class `IAccountRepository` with `getMine(userId)`, `updateMine(input)`, `uploadAvatar(input)`, `clearAvatar(userId)`.
- **New** `src/repositories/mfa-repository.port.ts` — abstract class `IMfaRepository` with `listFactors()`, `enrollTotp(friendlyName)`, `challenge(factorId)`, `verify(input)`, `unenroll(factorId)`.
- **New** `src/services/personal-account/get-mine.usecase.ts`.
- **New** `src/services/personal-account/update-mine.usecase.ts`.
- **New** `src/services/personal-account/upload-avatar.usecase.ts`.
- **New** `src/services/personal-account/clear-avatar.usecase.ts`.
- **New** `src/services/personal-account/update-password.usecase.ts` — orchestrates current-password re-auth (injected as a port or delegate) then `auth.updateUser`.
- **New** `src/services/mfa/enroll-totp.usecase.ts`.
- **New** `src/services/mfa/verify-factor.usecase.ts`.
- **New** `src/services/mfa/unenroll-factor.usecase.ts`.
- **New** `src/exceptions/invalid-current-password.exception.ts`.
- **New** `src/exceptions/invalid-profile-input.exception.ts`.
- **Update** `src/repositories/repositories.ts` — add `personalAccount` and `mfa` slots to the `Repositories` type.
- **Update** `src/repositories/index.ts` — re-export the two new ports.

### 7.2 Adapters (`packages/repositories/supabase` and `apps/web/src/lib/repositories`)

- **New** `packages/repositories/supabase/src/personal-account.repository.ts` — implements `IAccountRepository`; `uploadAvatar` follows the cache-bust + replace-old pattern from `~/Documents/work/guepard/guepard-console/.../update-account-image-container.tsx`.
- **New** `packages/repositories/supabase/src/mfa.repository.ts` — implements `IMfaRepository` by delegating to `client.auth.mfa.*` and returning mapped entities.
- **Update** `packages/repositories/supabase/src/index.ts` — re-exports.

### 7.3 Shell runtime (`packages/shell-runtime`)

- **New** `src/resources/personal-account.ts` — `shell.personalAccount.*` with `getMine()`, `updateMine({ name?, pictureUrl? })`, `uploadAvatar(file)`, `clearAvatar()`, `updatePassword({ current, next })`, `invalidate.mine()`.
- **New** `src/resources/mfa.ts` — `shell.mfa.*` with `listFactors()`, `enrollTotp(name)`, `verify({ factorId, code })`, `unenroll({ factorId, currentPassword })`, `invalidate.factors()`.
- **Update** `src/create-shell.ts` (or the equivalent composition root) — wire the two new resources into the shell client.

### 7.4 Server (`apps/server`)

No changes in phase 1. Profile writes go through the Supabase adapter directly from the browser; no server route is introduced.

### 7.5 Presentation — feature package (`packages/features/user-profile`)

- **New** package `packages/features/user-profile/` scaffold: `package.json`, `tsconfig.json`, `eslint.config.mjs`, `src/index.ts`, Storybook config mirroring `packages/features/accounts`.
- **New** `src/components/user-profile-section.tsx` — top-level stack of four cards; accepts data + callbacks as props, no `useShell()` inside.
- **New** `src/components/name-card.tsx` — RHF form with name input + submit.
- **New** `src/components/picture-card.tsx` — `ImageUploader` + clear button wiring.
- **New** `src/components/password-card.tsx` — wraps `UpdatePasswordForm` + gated "not linked" banner; adds `currentPassword` field.
- **New** `src/components/mfa-card.tsx` — factor list + setup CTA.
- **New** `src/components/multi-factor-auth-setup-dialog.tsx` — 3-step dialog (name → QR → OTP).
- **New** `src/components/multi-factor-auth-factors-list.tsx` — list with per-row unenroll (re-auth confirmation via sub-dialog).
- **New** Storybook stories for each card + the dialog + the full section.

### 7.6 Shell app (`packages/apps/user-settings`)

- **New** `src/sections/profile.tsx` — hosts `UserProfileSectionUI`, wires `useShell()` queries and mutations, placed before `sections/personal-tokens.tsx` in `plugin-root.tsx`.
- **Update** `src/plugin-root.tsx` — register the new section at the top of the sections array.
- **Update** `apps/web/src/lib/repositories-factory.ts` — construct `PersonalAccountRepository` and `MfaRepository` from Supabase and include them in the `Repositories` bag.

### 7.7 i18n (`packages/i18n`)

- **New** namespace `userProfile` in `packages/i18n/src/locales/en/user-profile.json`:
  - `userProfile.sectionTitle`
  - `userProfile.picture.title`, `userProfile.picture.description`, `userProfile.picture.clear`, `userProfile.picture.updating`, `userProfile.picture.updated`, `userProfile.picture.error`
  - `userProfile.name.title`, `userProfile.name.description`, `userProfile.name.label`, `userProfile.name.submit`, `userProfile.name.updated`, `userProfile.name.required`
  - `userProfile.password.title`, `userProfile.password.description`, `userProfile.password.current`, `userProfile.password.next`, `userProfile.password.confirm`, `userProfile.password.submit`, `userProfile.password.updated`, `userProfile.password.invalidCurrent`, `userProfile.password.noIdentityLinked`
  - `userProfile.mfa.title`, `userProfile.mfa.description`, `userProfile.mfa.emptyCalloutTitle`, `userProfile.mfa.emptyCalloutDescription`, `userProfile.mfa.setupButton`, `userProfile.mfa.dialog.nameTitle`, `userProfile.mfa.dialog.nameLabel`, `userProfile.mfa.dialog.nameHint`, `userProfile.mfa.dialog.qrTitle`, `userProfile.mfa.dialog.qrHint`, `userProfile.mfa.dialog.manualSecret`, `userProfile.mfa.dialog.otpTitle`, `userProfile.mfa.dialog.otpDescription`, `userProfile.mfa.dialog.verifying`, `userProfile.mfa.dialog.enable`, `userProfile.mfa.dialog.cancel`, `userProfile.mfa.enabled`, `userProfile.mfa.enrollError`, `userProfile.mfa.verifyError`, `userProfile.mfa.unenrollConfirm`, `userProfile.mfa.unenrollRemoved`
- Mirror stubs in every other locale file under `packages/i18n/src/locales/*/user-profile.json` with the English default copied in.
- **Update** the i18n namespace registry / type generator entrypoint so `t('userProfile.…')` is typed.

## 8. Permissions and RLS

No new permissions, no new RLS policies.

- `public.accounts` RLS policies (already defined in `04-initial-tables.sql`) gate reads/updates on `user_id = auth.uid()`.
- `storage.objects` policy for the `account_image` bucket (`19-storage.sql`) enforces path ownership via `get_storage_filename_as_uuid(name) = auth.uid()`.
- Password update and MFA operations are gated by Supabase's built-in auth policies (`auth.updateUser`, `auth.mfa.*`).

Adapter code must pass the session's access token with every call (automatic when using the browser client); any service-role usage is forbidden in this phase.

## 9. Security checklist

Pulled forward from RFC 0025 §8:

- [ ] Session required for every read and write — no anonymous path.
- [ ] `updateMine`, `uploadAvatar`, `clearAvatar` gated by RLS on `accounts.user_id = auth.uid()`.
- [ ] Storage uploads use `{userId}.{ext}?v={nanoid}` path so RLS enforces one-user-one-avatar.
- [ ] Client-side MIME + size checks before hitting Storage (reject non-image, >2 MB).
- [ ] Password update re-auths with current password **before** calling `auth.updateUser`.
- [ ] MFA `unenroll` re-auths with current password.
- [ ] First-factor enrollment does **not** require AAL2 (would deadlock a user with zero factors).
- [ ] TOTP secret and QR never logged; never persisted by the client.
- [ ] No new secrets. No new env vars.
- [ ] Pino redact already covers `password`, `otp`, `token`, `cookie` — verify no new log lines bypass it.
- [ ] Adapter never uses the service-role key; all operations run as the authenticated user.
- [ ] No PII appears in console logs or error messages shown to the user.

## 10. Verification plan

### 10.1 Static checks

- `pnpm typecheck` green across the new packages and modified files.
- `pnpm lint` green; no ESLint disables.
- `pnpm format` clean.

### 10.2 Unit tests

- `packages/domain`:
  - `UpdatePersonalAccountService` — happy path, empty-name rejection, unknown user.
  - `UploadAvatarService` — delegates to repo with expected path, propagates errors.
  - `ClearAvatarService` — sets `pictureUrl` null even when file already missing.
  - `UpdatePasswordService` — wrong current password throws `InvalidCurrentPasswordException`; correct current password calls `auth.updateUser` exactly once.
  - `EnrollTotpService`, `VerifyMfaFactorService`, `UnenrollFactorService` — each against a mocked `IMfaRepository`.
- `packages/features/user-profile` — component tests (`@testing-library/react`) for each card's state transitions; Storybook stories render without runtime error.

### 10.3 Integration tests

- `packages/repositories/supabase` — adapter tests against a local Supabase instance:
  - `PersonalAccountRepository.updateMine` writes `name` and `picture_url` as expected.
  - `PersonalAccountRepository.uploadAvatar` creates a file in `account_image` and returns a public URL; subsequent upload replaces the old file.
  - `MfaRepository.enrollTotp → challenge → verify` end-to-end with a seeded TOTP secret.
- No server route tests — no new routes.

### 10.4 End-to-end (Playwright)

Scenarios in `apps/e2e/tests/user-profile/`:

- `profile-navigation.spec.ts` — user reaches Settings → Profile, sees all four cards, Profile is listed above Personal tokens.
- `update-name.spec.ts` — user updates display name; topbar reflects the change without reload.
- `avatar-upload.spec.ts` — user uploads, sees the avatar in Profile + topbar, clears it, sees initials.
- `password-update.spec.ts` — email-identity user updates password with correct current; wrong current shows inline error; OAuth-only user sees the warning banner.
- `mfa-enroll.spec.ts` — user enrolls a TOTP factor (seeded QR secret), verifies with the seeded OTP, sees factor listed; unenroll with current password succeeds.

### 10.5 Manual smoke

Using `pnpm dev` with a fresh local Supabase:

1. Sign in as a test user with an email identity.
2. Open `/prj/{slug}/user-settings` — confirm Profile is the default section and appears above Personal tokens.
3. Change display name, click *Update Profile*. Confirm topbar avatar label updates immediately.
4. Upload a PNG avatar. Confirm the image appears in the card and in the topbar without reload.
5. Click *Clear*. Confirm initials return in both places.
6. Enter a wrong current password on the Password card. Confirm inline error; password unchanged.
7. Enter the correct current password and a valid new password. Confirm toast and that sign-out + sign-in with the new password works.
8. Click *Setup a new Factor*. Complete the 3-step dialog with an authenticator app. Confirm the factor appears in the list.
9. Click remove on the factor; enter current password. Confirm removal.
10. Sign in again with a Google-OAuth-only user. Confirm Profile renders with the password warning banner (no form).

## 11. i18n key map

| Area | Key root |
| --- | -------- |
| Section title + breadcrumbs | `userProfile.sectionTitle` |
| Profile Picture card | `userProfile.picture.*` |
| Your Name card | `userProfile.name.*` |
| Update Password card | `userProfile.password.*` (includes `userProfile.password.noIdentityLinked` resolved from open-question #3) |
| MFA card + setup dialog + list | `userProfile.mfa.*` |
| Shared error codes surfaced inside the MFA dialog | reuses existing `auth.errors.*` |

Full flat list under §7.7.

## 12. Implementation sequencing

Ordered per RFC 0025 §9.1 (vertical slices) and §9.2 (first task of every story must render). Each story inherits the rule: task 1 leaves a visible artifact at `/prj/{slug}/user-settings`; backend plumbing follows.

- **Story S1 — Profile section shell + Name card.** Create the section file with a read-only Name card (wrapped over `useUser()`), register it above Personal tokens, then add `IAccountRepository` port + Supabase adapter + `shell.personalAccount.*` resource, then swap the read-only card for an editable form. Storybook + tests.
- **Story S2 — Profile Picture card.** Read-only avatar preview first, then `uploadAvatar` / `clearAvatar` on the existing port + resource, then wire `ImageUploader`. Storybook + tests.
- **Story S3 — Password card.** Drop `UpdatePasswordForm` in gated on `useUserIdentities()`, then add `currentPassword` field + re-auth in the adapter, then i18n + error copy. Storybook + tests.
- **Story S4 — MFA card + enrollment dialog.** Read-only factor list first, then `IMfaRepository` port + Supabase adapter + `shell.mfa.*` resource, then 3-step enrollment dialog, then unenroll-with-re-auth. Storybook + tests.

Each story closes with a green `ui-smoke` at `/prj/{slug}/user-settings`. The final story closes with a green `e2e` across the full Profile surface.

## 13. Follow-ups (deferred, not in this phase)

- **Recovery / backup codes for MFA.** Phase 2 of RFC 0025.
- **Email change with confirmation flow and identity re-link.** Phase 2 of RFC 0025.
- **WebAuthn / passkeys as a factor type.** Phase 3+ of RFC 0025 (separate future RFC).
- **Account deletion / GDPR erasure.** Owned by RFC 0016 (auth audit + data lifecycle).
- **Language selector on Profile.** Owned by RFC 0024 (global shell UI), if ever.
- **Audit log events** for profile changes. Infrastructure owned by RFC 0016; RFC 0025 ports are already named so an audit adapter can wrap them without caller changes.
- **Hardening against polyglot image uploads** (SVG XSS, malformed image files). Phase 2 security follow-up.
- **Rate-limiting password re-auth attempts per account.** Owned by RFC 0017.

---

## Changelog

One line per deviation from this spec discovered during implementation. Populated by `/finish-story` when the "did the spec stay accurate?" check answers no.

- 2026-04-27 — 001-add-profile-name-card — i18n locale paths in §7.7 are `packages/i18n/src/locales/<lang>/...`; correct path is `apps/web/src/lib/i18n/locales/<lang>/...` (the `@guepard/i18n` package only ships the runtime, not locale JSON). Repo currently has only `en/`, no `fr/` — French locale promise dropped.
- 2026-04-27 — 002-add-profile-avatar-card — `IAccountRepository.uploadAvatar` takes `{userId, bytes: ArrayBuffer, extension}` instead of the spec §5.1 `File` shape. Justification: `packages/domain` must stay free of DOM types per the hex rule (`File`/`Blob` are browser-only). The runtime resource adapts `File → {bytes, extension}` before invoking the service. Behaviourally equivalent.
- 2026-04-28 — 003-add-profile-password-card — `shell.personalAccount.updatePassword` requires the caller to pass `sessionEmail`, not auto-resolved from runtime context (which exposes `currentUserId` only). `sections/profile.tsx` reads `useUser().data?.email` and threads it through. Spec §4.1 SD-4 implied auto-resolution; layering is still correct — the domain stays free of session state.
- 2026-04-28 — 004-add-profile-mfa-card — wrong-OTP error in the setup dialog uses a single i18n string (`userProfile.mfa.verifyError`) rather than the per-code mapping `auth:errors.<code>` suggested in spec §3.4. Justification: Supabase's verify failure surfaces a generic error, and spec §8.1's threat model already calls for "generic auth errors" — surfacing finer codes would invite identity-enumeration. Behaviourally consistent with the password-card pattern shipped in story 003.
