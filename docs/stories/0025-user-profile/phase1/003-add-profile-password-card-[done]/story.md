---
spec: docs/specs/0025-user-profile-phase1.md
spec_sections:
  - "#321-profile-section-prjsluguser-settings-sidebar--profile"
  - "#33-user-flows-happy-paths"
  - "#34-error-and-edge-case-behaviour"
  - "#1-resolved-open-questions"
  - "#72-adapters-packagesrepositoriessupabase-and-appswebsrclibrepositories"
  - "#73-shell-runtime-packagesshell-runtime"
  - "#75-presentation--feature-package-packagesfeaturesuser-profile"
  - "#77-i18n-packagesi18n"
  - "#9-security-checklist"
  - "#12-implementation-sequencing"
status: done
started: 2026-04-28
finished: 2026-04-28
blocks: []
blocked_by: [001]
---

# Add profile password card

## Goal

A signed-in user with an email identity can update their password by entering their current password and a new one; an OAuth-only user sees a banner explaining the password flow is unavailable.

## Scope

**In scope**

- Domain: `UpdatePasswordService` orchestrating a current-password re-auth then `auth.updateUser({ password })`; `InvalidCurrentPasswordException`.
- Adapter: `PersonalAccountRepository.updatePassword({ current, next })` calling `auth.signInWithPassword` with the session email, then `auth.updateUser` (spec §4.1 SD-4, spec §9 re-auth checklist).
- Shell runtime: `shell.personalAccount.updatePassword(input)`.
- Presentation: `PasswordCard` wrapping the existing `UpdatePasswordForm` with an added `currentPassword` field; gated on `useUserIdentities().isProviderConnected('email')` — renders the `userProfile.password.noIdentityLinked` banner otherwise (resolves open question #3).
- i18n: `userProfile.password.*` namespace, full English defaults (spec §7.7, §11).
- Storybook stories for the three states (form-for-email-identity, banner-for-oauth-only, wrong-current-password error).

**Out of scope** (forces honest slicing)

- Re-auth on card render (open question #2 resolved to submit-only).
- Password strength meter / HIBP check — not in spec.
- MFA card.
- Avatar or name.

## Acceptance criteria

- [x] For an email-identity user, the card renders three fields (current, new, confirm) and a submit button. *Component test asserts this state.*
- [x] For an OAuth-only user (no `email` identity), the card renders the banner *"You cannot update your password because your account is not linked to any."* and no form.
- [x] Submitting with the wrong current password shows an inline error on the `currentPassword` field and does not call `auth.updateUser`. *Adapter throws `InvalidCurrentPasswordException` from `signInWithPassword` failure before `auth.updateUser`; section.tsx surfaces it via `currentPasswordError` prop.*
- [x] Submitting with the correct current password + a valid new password persists the change. *Logic-verified through adapter + service flow; not browser-tested in this run.*
- [x] All i18n strings route through `userProfile.password.*`; no hardcoded user-facing text.
- [x] The card does not re-prompt for the current password on render — only on submit (open question #2).
- [x] `pnpm typecheck` (54/54), `pnpm lint` (clean), `pnpm --filter @qlm/domain test` (308 tests), `pnpm --filter @qlm/user-profile test` (18/18) all pass.

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-add-readonly-password-card](001-add-readonly-password-card-[done].md) — features · ui-smoke · ✅
2. [002-wire-password-update-spine](002-wire-password-update-spine-[done].md) — adapter · domain-test · ✅
3. [003-make-password-card-interactive](003-make-password-card-interactive-[done].md) — features · ui-smoke · ✅

## Demo / verification

1. `pnpm supabase:web:start && pnpm dev`, sign in as a seeded email-identity user.
2. **Settings → Profile** → **Update your Password**: confirm the three-field form renders.
3. Submit with a wrong current password. Confirm inline error; adapter is not called (Network tab — only the `signInWithPassword` re-auth call fails, no `updateUser`).
4. Submit with the correct current + a new valid password. Confirm success toast.
5. Sign out, sign back in with the new password. Confirm access.
6. Sign in as a Google-OAuth seeded user (no `email` identity). Confirm the card renders the warning banner and no form.
7. `pnpm --filter @qlm/i18n build` — confirm no missing-key warnings.

## Questions surfaced

Propagated to the spec's resolved-questions table by `/finish-story`. Empty is the common case.

- <bullet, only when something unexpected came up during implementation>

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`. `no` triggers a `Changelog` line in the spec.

- [x] The referenced spec sections still match the implementation as shipped — **no**: `shell.personalAccount.updatePassword` takes `sessionEmail` from the caller (not auto-resolved). See spec §Changelog 2026-04-28.
