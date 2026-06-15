# RFC 0025 — User profile

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Status     | Draft                                                                 |
| Author     | Hani Chalouati                                                        |
| Created    | 2026-04-23                                                            |
| Target     | A personal "Profile" section inside the **User settings** app that lets the signed-in user edit their display name, avatar, password, and MFA factors. |
| Supersedes | RFC 0013 — **enrollment slice only**. RFC 0013 continues to own sign-in-time factor verification and AAL2 policy enforcement. |
| Related    | RFC 0010 (auth identity data model), RFC 0013 (auth MFA / AAL2), RFC 0016 (auth audit + data lifecycle — account deletion lives there), RFC 0022 (auth storage migration — avatars), RFC 0024 (global shell UI — host app) |

## 1. Summary

RFC 0025 introduces the **Profile** section inside the existing **User settings** app (`packages/apps/user-settings`), rendered above the existing **Personal tokens** section. Profile is a per-user editor for the four attributes a signed-in user expects to manage themselves: the display name on their personal `accounts` row, the avatar image stored in the `account_image` storage bucket, the auth password when one exists, and their multi-factor authentication (MFA) factors.

The page is hosted as a new `sections/profile.tsx` inside the `user-settings` plugin, so no new app, no new route, and no change to the project-shell nav slot. Users reach it via **Settings → Profile**, matching the mockup in `0025-user-profile/user-profile.png`.

**Phase 1 ships** a single Profile page with four subsections — display name, profile picture, password, MFA — plus the supporting domain/adapter plumbing the `accounts` row needs to persist the first two fields. MFA enrollment is TOTP-only in phase 1; recovery codes defer to phase 2 (§3.2). RFC 0025 authors the enrollment flow end-to-end and supersedes the corresponding enrollment slice of RFC 0013; factor verification at sign-in remains in RFC 0013's scope.

A full reference implementation of the same four subsections exists in the legacy `guepard-console` repo at `packages/features/accounts/src/components/personal-account-settings/`. RFC 0025 inherits its UX and API flows (card layout, avatar cache-busting pattern, 3-step TOTP enrollment dialog) while re-building the data path through v3's hexagonal layering — ports, adapters, shell-runtime resources — instead of the legacy's direct Supabase-client calls. See §4.2 for what is lifted and what is not.

## 2. Motivation

The v3 console is a ground-up rewrite of the legacy `guepard-console`. Customers migrating to v3 are carrying user accounts that were created in the legacy console, and those accounts expect — at minimum — to be able to update their display name, avatar, password, and MFA factors without calling support. The legacy console ships those four flows today at `/home/settings/profile`; v3 ships only **Personal tokens** under **User settings**. For anyone looking at the settings menu, the gap is immediate and visible.

The primary driver for RFC 0025 is **feature parity with the legacy console** in the narrowest usable form: the four subsections the mockup calls out, hosted as one section inside the existing **User settings** app. Language selector, email change, and account deletion — all present in the legacy container — are **out of phase-1 scope** either because v3 needs a different home for them (language lives with global shell prefs under RFC 0024) or because they need surfaces larger than Profile should own (email change requires an identity re-link flow; account deletion requires the data-lifecycle work tracked in RFC 0016).

A secondary driver is **unblocking MFA self-service**. RFC 0013 (auth-mfa-aal2) is a stub; no code in v3 lets a user enroll a second factor today. AAL2 policy is enforced on protected tables via `public.is_mfa_compliant()` (`apps/web/supabase/schemas/16-mfa.sql`), so a user who has never enrolled a factor is silently locked out of features gated on AAL2. RFC 0025 absorbs the **enrollment** slice of 0013 and ships it as the first concrete UI on top of Supabase's `auth.mfa.enroll/challenge/verify` APIs. RFC 0013 continues to own sign-in-time factor verification and AAL2 policy enforcement; 0025 does not touch either.

**Dependency direction.** RFC 0025 depends upstream on RFC 0010 (identity data model — for the identity-linking check that gates password updates) and RFC 0024 (global shell UI — for the User settings app's presence in the project.overflow nav slot). It depends downstream on **nothing**: shipping 0025 does not block any other RFC. Phase 2 of 0025 (recovery codes + email change) may later reuse primitives introduced by RFC 0018 (session hardening) and RFC 0016 (audit log), but those are compatible additions, not ordering constraints.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- **Display name edit** — signed-in user can change `accounts.name` on their personal account; the new value propagates to the user menu avatar label on next render.
- **Avatar upload** — signed-in user can upload an image to the `account_image` bucket, see it rendered immediately, and clear it back to initials; `accounts.picture_url` is updated accordingly.
- **Password update** — signed-in user who has an `email` identity can update their password; a user with only OAuth identities sees the inline *"You cannot update your password because your account is not linked to any"* notice and no form.
- **MFA enrollment** — signed-in user can enroll a TOTP factor (QR code + manual secret), verify it with a 6-digit code, see the list of their active factors, and unenroll one (gated on current-password re-auth). Recovery/backup codes are out of phase 1 (§3.2).
- **Ordering** — inside `user-settings`, the Profile section renders **above** Personal tokens.

### 3.2 Non-goals (phase 1)

- **Email change.** Phase 2 of this RFC. Requires confirmation-email flow and re-linking the `email` identity on `auth.users`; non-trivial surface that should not piggy-back on phase 1.
- **Recovery codes / MFA backup codes.** Phase 2 of this RFC. Needs a storage table for hashed codes plus a one-time display UI and a redeem-at-sign-in flow; separate slice from TOTP enrollment.
- **WebAuthn / passkeys as a factor type.** Phase 3+, dedicated future RFC. Adds attestation handling and cross-browser UX that would dominate phase 1 if included.
- **Account deletion / GDPR erasure ("Danger Zone" in the legacy console).** Folded into RFC 0016 (auth audit + data lifecycle). Requires a 30-day soft-delete SLA, cascade semantics, and audit-log entries — responsibilities that sit with the lifecycle RFC, not Profile.
- **Language selector inside Profile.** The legacy console renders a language dropdown here; v3 locates shell-wide user preferences under RFC 0024 (global shell UI). Out of scope for RFC 0025 entirely.
- **Factor verification at sign-in, AAL2 policy enforcement, step-up to AAL2.** Remain in RFC 0013's scope. RFC 0025 only authors enrollment and unenrollment.
- **Organization settings.** Orthogonal — `organizations` are a distinct entity and have their own settings surface. Profile writes only to the signed-in user's `accounts` row.

## 4. Prior art

### 4.1 In this repo (reuse)

- **Reused**: `packages/apps/user-settings/src/plugin-root.tsx` and `sections/personal-tokens.tsx` — Profile is added as a new sibling section in the same plugin root; no new manifest, no new route.
- **Reused**: `packages/features/settings-shell` — provides the `SettingsSidebar` + `SettingsSection` contract. Profile registers as one more `SettingsSection`.
- **Reused**: `packages/features/auth/src/components/update-password-form.tsx` + `packages/supabase/src/hooks/use-update-user-mutation.ts` — existing password-change form and mutation; consumed via a shell-runtime resource in the Password subsection.
- **Reused**: `packages/supabase/src/hooks/use-user-identities.ts` — drives the "account not linked" branch; the Password subsection checks `isProviderConnected('email')` before rendering the form.
- **Reused**: `packages/supabase/src/hooks/use-fetch-mfa-factors.ts` + `packages/features/auth/src/components/multi-factor-challenge-container.tsx` — factor listing and sign-in-time challenge-verify UI. Enrollment (factor creation + QR display) is new.
- **Reused**: `packages/ui/src/shadcn/image-uploader.tsx` + `packages/ui/src/guepard/profile-avatar.tsx` — file-picker primitive and avatar renderer for the Profile Picture subsection.
- **Reused**: `apps/web/supabase/schemas/19-storage.sql` (`account_image` bucket with RLS via `get_storage_filename_as_uuid`) — avatar upload target. No new bucket, no RLS changes for phase 1.
- **Reused**: `accounts.name` and `accounts.picture_url` columns (`apps/web/supabase/schemas/04-initial-tables.sql`) — no schema change needed.
- **Replaced**: the MFA enrollment slice of RFC 0013 — RFC 0025 authors the enroll/unenroll flows as the first concrete UI over Supabase's `auth.mfa.enroll()` / `challenge()` / `verify()` APIs. RFC 0013 continues to own sign-in-time factor verification and AAL2 policy enforcement.
- **Orthogonal**: `organizations`, organization membership, and organization role management. In v3, `accounts` is personal-only (one row per `auth.users` row, unique `user_id`; schema comment at `apps/web/supabase/schemas/04-initial-tables.sql:79` — *"Accounts are personal accounts only (one per user). Team accounts have been replaced by organizations."*). Profile never reads or writes an `organizations` row.

### 4.2 Legacy `guepard-console` repo (UX/flow reference, not architecture reference)

A full reference implementation of the four subsections already lives in the legacy Next.js-based `guepard-console` repo at `~/Documents/work/guepard/guepard-console/packages/features/accounts/src/components/personal-account-settings/`. It is the UX contract this RFC inherits — screenshots and form flows map 1:1 — but its internal layering does **not** match v3's hexagonal architecture and must not be copied verbatim.

**Reused as UX + flow spec**:

- `account-settings-container.tsx` — card layout order (image, name, password, MFA) matches the v3 mockup once Email edit, Language selector, and Danger zone are omitted.
- `update-account-image-container.tsx` — avatar upload pattern: bucket `account_image`, filename `{userId}.{extension}?v={nanoid}` for cache-busting, clear-old-then-upload-new sequencing, `null` to clear.
- `mfa/multi-factor-auth-setup-dialog.tsx` — 3-step enrollment dialog (factor friendly-name → QR code + manual secret → 6-digit OTP verify), session refresh after verify.
- `mfa/multi-factor-auth-list.tsx` — list + unenroll existing factors.
- `password/update-password-container.tsx` — password-change flow including the server-side revalidation callback.
- `email/update-email-form-container.tsx` — **ignored in phase 1**, deferred.

**Explicitly not reused (architecture gap)**: the legacy components call the Supabase client directly (`client.from('accounts').update(...)`, `client.storage.from(...).upload(...)`, `client.auth.mfa.enroll(...)`) and use a Next.js server-action for session refresh. In v3 these reads and writes must go through a domain repository port, an adapter in `packages/repositories/supabase`, and a shell-runtime resource (§6). The legacy code is quoted for behavior, not copied for structure.

## 5. Conceptual model

### 5.1 Two entities, two ports

Profile operates on two conceptually distinct objects. Keeping them on separate domain ports matches the hexagonal rule *"Do not skip the port"* and keeps the test surface small.

- **Account** — one row per user in `public.accounts`. Fields touched by Profile: `name` and `picture_url`. Owned by the new `IAccountRepository` port. In v3, `accounts` is the personal profile entity; there is no "team account" variant (§4.1).
- **MFA factor** — zero or more rows per user in Supabase's `auth.mfa_factors`. Managed exclusively through `auth.mfa.enroll / challenge / verify / unenroll` — direct SQL is not a supported surface. Owned by the new `IMfaRepository` port.

Password is neither a `accounts` field nor a factor — it lives on `auth.users` and is mutated through Supabase's `auth.updateUser({ password })`. RFC 0025 does not introduce a port for it; it reuses the existing `useUpdateUserMutation` hook, wrapped in a re-auth step (§8).

### 5.2 Lifecycles

- **Account**: created by the auth trigger that inserts a row into `accounts` when a new `auth.users` row is created. Immutable `id` and `user_id`; mutable `name`, `picture_url`. Never deleted by Profile — deletion is RFC 0016's concern.
- **Avatar**: a file in the `account_image` storage bucket. Key is rooted at the owner's `user_id` so Storage RLS (`get_storage_filename_as_uuid`) enforces one-user-one-avatar. A clear operation deletes the file and sets `accounts.picture_url = null`. An upload replaces the previous file and writes the new public URL.
- **MFA factor**: states are *enrolling* (created by `enroll`, not yet verified), *active* (after the first successful `verify`), and *unenrolled* (removed by `unenroll`). A never-verified factor is effectively a dangling enrollment and is unenrolled when the user cancels or the session ends — this is Supabase's behavior and RFC 0025 does not change it.

### 5.3 What Profile does not conceptually model

- **Sessions, AAL2 policy, sign-in challenges.** RFC 0013's territory. Profile asks `auth.mfa.listFactors()` to render state; it does not compute AAL.
- **Identity providers.** Profile reads `useUserIdentities()` only to decide whether to render the Password card. Linking/unlinking identities is out of scope; it may become its own phase-2 card when email change is added.
- **Audit trail of profile changes.** Out of phase 1 (see RFC 0016). The ports are designed so a future audit adapter can wrap them without changing callers.

## 6. UX surface

### 6.1 Placement and ordering

- Host app: `packages/apps/user-settings` (`layer: project`, `routeBase: user-settings`, nav slot `project.overflow`).
- New section file: `packages/apps/user-settings/src/sections/profile.tsx`.
- Section order inside `plugin-root.tsx`: **Profile first**, then the existing **Personal tokens**, then any later sections.
- URL the user reaches: `/prj/{projectSlug}/user-settings` with Profile as the default sidebar item in `SettingsSidebar`.

### 6.2 Card layout

Mirrors `0025-user-profile/user-profile.png` exactly — four cards, stacked, each a `Card` + `CardHeader` + `CardContent` primitive from `packages/ui`:

1. **Your Profile Picture** — `ImageUploader` with the current avatar (or initials fallback from `ProfileAvatar`), a *Clear* affordance, and the subcopy *"Please choose a photo to upload as your profile picture."*
2. **Your Name** — labeled input bound to `accounts.name`, an *Update Profile* submit button, and the subcopy *"Update your name to be displayed on your profile."*
3. **Update your Password** — the existing `UpdatePasswordForm` for users with an `email` identity. For OAuth-only users, render the warning banner *"You cannot update your password because your account is not linked to any"* and suppress the form.
4. **Multi-Factor Authentication** — factor list + a *Setup a new Factor* CTA that opens the 3-step enrollment dialog. Empty state shows the "Secure your account with Multi-Factor Authentication" callout from the mockup.

### 6.3 State surface per card

| State          | Picture                              | Name                        | Password                                   | MFA                                         |
| -------------- | ------------------------------------ | --------------------------- | ------------------------------------------ | ------------------------------------------- |
| Loading        | Skeleton in the `ImageUploader` slot | Input disabled, skeleton    | Form disabled, skeleton                    | Skeleton list                               |
| Saving         | Toast: *Updating profile…*           | Submit button disabled      | Submit button disabled, current-password required | Dialog *Verifying…* state                   |
| Success        | Toast: *Profile updated*             | Toast: *Profile updated*    | Toast: *Password updated*                  | Toast: *MFA enabled* + session refresh      |
| Error          | Toast: *Could not update profile*    | Inline field error          | Inline error (wrong current password, etc.) | Alert inside dialog with `auth:errors.*` key |
| Identity-gated | —                                    | —                           | Warning banner replaces the form           | —                                           |

### 6.4 Out of this RFC

- No confirm-before-leave dialog on unsaved changes in phase 1. The forms submit on click; there is no long-lived draft.
- No optimistic updates. Avatar in particular is write-then-refetch, matching the legacy flow.
- No Storybook visual-regression automation — each card ships a story file per the testing rule, validated by eye.

## 7. Data and storage model

### 7.1 Writes

| Source of truth | Column / object                                   | Written by                                    | Notes                                                                                                 |
| --------------- | ------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `public.accounts` | `name`                                          | `IAccountRepository.updateMine({ name })`     | `varchar(255) not null`. Rejects empty strings in the domain.                                         |
| `public.accounts` | `picture_url`                                   | `IAccountRepository.updateMine({ pictureUrl })` / adapter after avatar upload or clear | Public URL from Storage, cache-busted.                                                                |
| `storage.objects` (`account_image` bucket) | file path `{userId}.{ext}?v={nanoid}` | `IAccountRepository.uploadAvatar(file)` / `clearAvatar()` | Old file removed before the new one uploads. Cache-busted `nanoid` forces re-fetch. |
| `auth.users`    | `encrypted_password`                              | `auth.updateUser({ password })` via `useUpdateUserMutation` | RFC 0025 adds a current-password re-auth before calling it (§8.2).                                    |
| `auth.mfa_factors` | row lifecycle                                  | `IMfaRepository.enrollTotp / verify / unenroll` → `auth.mfa.*` | Adapter delegates to Supabase; no direct table writes.                                                |

### 7.2 Reads

| Read                           | Source                                                              | Surface                                             |
| ------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------- |
| Current profile (name, picture) | `public.accounts where user_id = auth.uid()`                        | `shell.personalAccount.getMine()`                    |
| Identities (for password gating) | `auth.users.identities` via `useUserIdentities()`                  | Read directly by the Password card; not a domain port in phase 1 (reuses existing hook). |
| Factors                        | `auth.mfa.listFactors()`                                            | `shell.mfa.listFactors()`                            |

### 7.3 No schema changes

Phase 1 adds **no new tables, no new columns, no new RLS policies, no new storage buckets**. The entire surface sits on existing schema:

- `04-initial-tables.sql` (accounts row)
- `16-mfa.sql` (AAL2 helpers, unchanged)
- `19-storage.sql` (`account_image` bucket RLS, unchanged)

### 7.4 Hexagonal layering

| Layer              | Phase-1 additions                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `packages/domain`  | `repositories/account-repository.port.ts` (new), `repositories/mfa-repository.port.ts` (new), DTOs + exceptions + service classes for each operation |
| `packages/repositories/supabase` | `account.repository.ts` (new), `mfa.repository.ts` (new) — concrete implementations                                  |
| `packages/shell-runtime` | `resources/personal-account.ts` (new), `resources/mfa.ts` (new) — typed shell client resources                            |
| `packages/features` | `features/user-profile` (new) — presentational cards; may extend `features/auth` with the 3-step TOTP enrollment dialog          |
| `packages/apps/user-settings` | `sections/profile.tsx` (new) — wires `useShell()` calls to feature cards and registers the new section ordering      |
| `apps/web`         | `lib/repositories-factory.ts` — wire the two new adapters into `WorkspaceContext`                                                |

## 8. Security and trust boundaries

RFC 0025 follows `.claude/rules/security.md`. The relevant controls are **CC6.1** (logical access), **CC6.6** (authentication), **CC6.7** (re-auth for sensitive operations), and **A.8.24** (use of cryptography — TOTP secret + QR). Compliance evidence is tracked in Vanta, not in this repo.

### 8.1 Threat model highlights

- **T1 — Hijacked session edits profile.** Mitigated by RLS (`accounts.user_id = auth.uid()`) plus the re-auth gate on destructive operations (§8.2). Read of own profile is cheap and does not need extra protection.
- **T2 — Hijacked session disables MFA.** Mitigated by requiring current-password re-auth on `unenroll` (§8.2) — the attacker would need the password, which defeats the hijack.
- **T3 — User replaces someone else's avatar.** Mitigated by Storage RLS: the bucket path must start with the caller's `user_id`, enforced by `get_storage_filename_as_uuid(name) = auth.uid()` in the existing `19-storage.sql` policy.
- **T4 — Malicious file upload (XSS via SVG, malware).** Mitigated by client-side MIME/size checks in `ImageUploader` and Storage's public-bucket content-type. Not bulletproof — hardening against polyglots is a phase-2 concern.

### 8.2 Re-authentication matrix

| Operation                          | Gate                                                                 |
| ---------------------------------- | -------------------------------------------------------------------- |
| Read profile / factors             | Authenticated session.                                                |
| Update `name` / `picture_url`      | Authenticated session. No re-auth.                                    |
| Upload / clear avatar              | Authenticated session. No re-auth.                                    |
| Enroll a new MFA factor            | Authenticated session. **No AAL2 precondition** — a first-time user has no factors and cannot reach AAL2. |
| Verify an enrolling factor         | Session + the user's own TOTP code. Session is refreshed on success. |
| Unenroll an MFA factor             | Session + **current password re-verify** (`auth.signInWithPassword` against the session email immediately before `auth.mfa.unenroll`). |
| Update password                    | Session + **current password re-verify**, then `auth.updateUser({ password: new })`. The existing `UpdatePasswordForm` gains a `currentPassword` field. |

### 8.3 Secrets and logging

- **TOTP secret** is rendered once inside the enrollment dialog (QR + manual-entry string). Never logged. The manual-entry string is shown in the QR component; never leaves the client.
- **Passwords** (both current and new) are never logged. Pino redact rules in `.claude/rules/security.md` already cover `password` / `token` / `cookie` / `otp`.
- **No new secrets** are introduced in phase 1 — Profile reuses the existing Supabase anon key for browser calls and the existing service-role key for any future adapter needs.

### 8.4 Audit (phase 1: emit-ready, store-later)

The ports are named so a future audit adapter (RFC 0016) can intercept and write an event per call without any caller change: `account.updated`, `account.avatar_uploaded`, `account.avatar_cleared`, `account.password_updated`, `mfa.factor_enrolled`, `mfa.factor_verified`, `mfa.factor_unenrolled`. Phase 1 does **not** write to an audit table; that table is RFC 0016's artifact.

## 9. Rollout plan

| Phase | Scope                                                                                                                                                                                                                                  | Artifacts                                  | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------ |
| 1     | Profile section in `user-settings` app, rendered above Personal tokens. Four subsections: display name (`accounts.name`), avatar upload (`account_image` bucket + `accounts.picture_url`), password update (email-identity gated), MFA enrollment + unenrollment (TOTP, no recovery codes yet). Domain + adapter + shell-runtime plumbing for account reads/writes and MFA flows. | This RFC + `docs/specs/0025-user-profile-phase1.md` | Draft  |
| 2     | Recovery codes for MFA (one-time display, hashed-at-rest, redeem at sign-in) and email change with confirmation flow + identity re-link. Same Profile section, two additional UI cards.                                                | Phase 2 RFC amendment + phase-2 spec       | Future |

### 9.1 Phase-1 sequencing — vertical slices, demo first

The phase-1 spec must slice by **subsection**, not by layer. Each story lands one full-stack slice (port method + adapter method + shell-runtime resource method + UI card) so the Profile URL shows something visible by the end of the first story, and one more card each story after.

| Story order | Contents | Demo at close |
| ----------- | -------- | ------------- |
| **S1** | `IAccountRepository` port + Supabase adapter (personal-account subset: `getMine`, `updateMine`) + `shell.personalAccount.*` resource + new `sections/profile.tsx` inside `user-settings` + **Name card**. | Settings → Profile renders with an editable name card. |
| **S2** | Adapter additions for `uploadAvatar` / `clearAvatar` + shell-runtime resource additions + **Profile Picture card**. Reuses `ImageUploader` and `account_image` bucket. | Name + avatar both editable; avatar roundtrips through storage. |
| **S3** | **Password card** — reuses `UpdatePasswordForm`, adds the identity-linked warning branch using `useUserIdentities`, adds current-password re-auth. | Password updates for email-identity users; OAuth-only users see the "not linked" notice. |
| **S4** | `IMfaRepository` port + Supabase adapter + `shell.mfa.*` resource + **MFA card**: list factors, 3-step TOTP enrollment dialog (friendly-name → QR → OTP verify), unenroll-with-re-auth. | User can enroll a TOTP factor end-to-end and sign out/in with AAL2. |

**Anti-pattern to reject during spec drafting**: a separate "infrastructure / scaffolding" story that builds both ports, both adapters, and both shell-runtime resources before any UI renders. Every backend change belongs inside the story that consumes it. The 1–8 tasks-per-story cap accommodates this — S1 and S4 each carry 4–6 tasks (port, adapter, resource, UI, Storybook, tests).

### 9.2 Task-level sequencing — first task of every story must render

Story-level vertical slicing (§9.1) is not enough on its own. A story decomposed into 4–6 tasks can still bury the UI: *task 1 port, task 2 adapter, task 3 resource, task 4 UI* puts nothing on screen until hour 3–4 of the story. Each story's first task must therefore leave a **visible artifact at the target URL**, using whatever read-only primitives already exist, so the remaining tasks only add behavior.

| Story | Task 1 (UI visible) | Remaining tasks |
| ----- | ------------------- | ---------------- |
| **S1 — Name** | Create `sections/profile.tsx` with a **read-only** Name card that reads from the existing `useUser()` / `usePersonalAccountData`-style hook. Register the section in `plugin-root.tsx` above Personal tokens. End-of-task 1: **Profile URL renders**. | (2) `IAccountRepository` port + DTO + `getMine` service. (3) Supabase adapter + factory wiring. (4) `shell.personalAccount.*` resource. (5) Swap the read-only Name card to an editable form bound to `updateMine`. (6) Storybook + unit tests. |
| **S2 — Avatar** | Add a read-only avatar preview card to `sections/profile.tsx` using `ProfileAvatar` + the current `accounts.picture_url`. End-of-task 1: **avatar card visible**, no upload behavior. | (2) Adapter + resource additions for `uploadAvatar`/`clearAvatar`. (3) Wire `ImageUploader` `onValueChange`. (4) Clear affordance. (5) Storybook + tests. |
| **S3 — Password** | Drop the existing `UpdatePasswordForm` into the page, gated on `useUserIdentities().isProviderConnected('email')`. End-of-task 1: **card renders** for email-identity users or shows the warning banner for OAuth-only users. | (2) Add `currentPassword` field + re-auth call before `updateUser`. (3) Error copy + i18n. (4) Storybook + tests. |
| **S4 — MFA** | Render the factor list card using the existing `useFetchAuthFactors()` hook (read-only) and a disabled *Setup a new Factor* button. End-of-task 1: **MFA card visible with current factor state**. | (2) `IMfaRepository` port + adapter (enroll/challenge/verify/unenroll). (3) `shell.mfa.*` resource. (4) 3-step enrollment dialog (name → QR → OTP). (5) Session refresh after verify. (6) Unenroll with password re-auth. (7) Storybook + tests. |

**Why this works.** Each story's first task is bounded, shippable on its own (the validator's `ui-smoke` runs against the visible URL), and decoupled from the port/adapter work that follows. If a later task hits an issue, the page does not disappear — it just stops gaining behavior. The Storybook rule (`.claude/rules/testing.md`) is satisfied because task 1 is already a storyable component; later tasks update the story.

**Corollary for the spec author**: task 1 of every story carries `validation.kind: ui-smoke` against `/prj/$projectSlug/user-settings`. Backend-only tasks (port, adapter, resource) use `domain-test` or `route-test`. The final wiring task in each story carries `ui-smoke` or `e2e` for the full behavior.

## 10. Open questions

1. **Do we surface the avatar in the shell topbar immediately after upload, or on next navigation?** At stake: whether `shell.personalAccount.updateMine` must invalidate the same query that the topbar reads. Proposal: use a shared query key (e.g. `['personal-account', userId]`) so a single mutation invalidation refreshes both Profile and the topbar avatar.
2. **Does the Password card need re-auth on render, or only on submit?** At stake: UX cost of an extra password prompt versus defence-in-depth against a hijacked session scrolling to the card. Proposal: prompt on submit only, matching the legacy console and §8.2.
3. **What is the exact copy for the "account not linked" banner and its i18n key namespace?** At stake: the phrasing shown in the mockup is not a final string. Proposal: namespace `userProfile.password.noIdentityLinked` with English default matching the mockup verbatim, translations deferred to a standard i18n follow-up.

## 11. Alternatives considered

- **Separate `/me` route outside the project shell.** Considered. Rejected — the draft explicitly frames Profile as a Settings sub-page, the existing `user-settings` app is already a per-user bucket, and a global `/me` would duplicate the sidebar structure.
- **New `packages/apps/user-profile` plugin.** Considered. Rejected — splits user-facing settings across two plugins and complicates the `project.overflow` menu for a page that is one more sibling of Personal tokens.
- **`auth.users.user_metadata` as the source of truth for name/avatar.** Considered. Rejected — the repo already renders the user menu from `accounts.name` / `accounts.picture_url`, and `accounts` is the canonical row for user identification; writing to `user_metadata` would introduce a second source of truth and a sync problem.
- **Extend `IUserRepository` with personal-account writes.** Considered during the port decision. Rejected — the user repository models `auth.users` semantics; mixing it with `accounts` row writes would blur the entity boundary. A dedicated `IAccountRepository` is cheaper than that debt.
- **Fold MFA enrollment into `IAccountRepository`.** Considered. Rejected — MFA factors are an auth concept, not a profile attribute, and Supabase exposes them through a distinct `auth.mfa.*` surface. A single port doing "account edits AND factor lifecycle" would have a large test matrix and would later resist swap-out when the auth migration (RFC 0010–0023) lands.
- **Fully absorb RFC 0013 into this RFC.** Considered. Rejected — sign-in-time factor verification and AAL2 policy enforcement have different stakeholders (sign-in flow, middleware, DB helpers) and a different review cadence. Partial supersession keeps 0025 focused on the self-service surface.
- **Copy the legacy `personal-account-settings` components directly.** Considered. Rejected — the legacy code calls the Supabase client from React, which violates `.claude/rules/hexagonal-architecture.md`. The UX is copied, the layering is re-done. See §4.2.

## 12. References

- `.claude/templates/rfc.md` — template this RFC follows.
- `.claude/rules/spec-driven-dev.md` — layering rules.
- `.claude/rules/security.md` — identity, session, MFA rules.
- RFC 0010 `docs/rfcs/0010-auth-identity-data-model.md`.
- RFC 0013 `docs/rfcs/0013-auth-mfa-aal2.md`.
- RFC 0022 `docs/rfcs/0022-auth-storage-migration.md`.
- RFC 0024 `docs/rfcs/0024-global-shell-ui.md`.
- Mockup: `./0025-user-profile/user-profile.png`.

---

## Review checklist for the author

- [ ] Does §1 make the scope obvious in one paragraph?
- [ ] Is every §3.1 goal an observable exit criterion?
- [ ] Is every §3.2 non-goal pinned to a named future phase?
- [ ] Does §4 distinguish reused prior art from replaced prior art?
- [ ] Would a newcomer understand the concept after reading only §1 through §5?
- [ ] Are the open questions real decisions, or are any of them placeholders?
- [ ] Does the rollout plan match realistic engineering capacity for the next quarters?
- [ ] Does every alternative in §11 have a concrete reason it was not chosen?
