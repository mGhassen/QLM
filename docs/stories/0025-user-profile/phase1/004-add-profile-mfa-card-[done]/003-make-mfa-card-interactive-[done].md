---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/user-profile/src/components/mfa-card.tsx
  - packages/features/user-profile/src/components/mfa-card.stories.tsx
  - packages/features/user-profile/src/components/multi-factor-auth-setup-dialog.tsx
  - packages/features/user-profile/src/components/multi-factor-auth-setup-dialog.stories.tsx
  - packages/features/user-profile/src/components/multi-factor-auth-factors-list.tsx
  - packages/features/user-profile/src/components/index.ts
  - packages/features/user-profile/src/index.ts
  - packages/features/user-profile/__tests__/mfa-card.test.tsx
  - packages/features/user-profile/__tests__/multi-factor-auth-setup-dialog.test.tsx
  - packages/apps/user-settings/src/sections/profile.tsx
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/user-settings
  expect_console: empty
---

# Make MFA card interactive

Build the 3-step `MultiFactorAuthSetupDialog` (friendly name → QR + manual secret → 6-digit OTP) and the `MultiFactorAuthFactorsList` with current-password re-auth on unenroll. Wire all of it to `shell.mfa.*` via `useMutation` and refresh the session after a successful verify.

## Done when

- [ ] *Setup a new Factor* opens `MultiFactorAuthSetupDialog`. Step 1 collects the friendly name; Step 2 calls `shell.mfa.enrollTotp(name)`, displays the returned `qr_code` (data URI) plus `secret` in monospace; Step 3 collects a 6-digit `InputOTP` and calls `shell.mfa.verify({factorId, code})` (the runtime resource resolves the `challengeId` internally).
- [ ] On verify success: dialog closes, `['mfa-factors', userId]` invalidates, success toast `userProfile.mfa.enabled`. On wrong OTP: stays on step 3 with an inline alert keyed to `userProfile.mfa.verifyError`.
- [ ] Cancelling the dialog mid-enrollment unenrolls the pending factor (so no dangling unverified row remains).
- [ ] `MultiFactorAuthFactorsList` renders one row per active factor with a Remove button. Remove triggers an inline confirmation that prompts for the current password; on submit, the section calls `signInWithPassword` first then `shell.mfa.unenroll(factorId)`. On wrong password, surface inline error; on success, invalidate factors and toast `userProfile.mfa.unenrollRemoved`.
- [ ] No factor enrollment requires AAL2 — the spec calls this out explicitly so the first-time user can complete the flow from a fresh session.
- [ ] Storybook stories: setup dialog (Name step / QR step / Verify step / Error), factors list (Empty / OneFactor / WithUnenrollDialog).
- [ ] Component tests cover: dialog 3-step happy path, wrong OTP, cancel-mid-flow unenroll, list unenroll happy path, list unenroll wrong-password.
- [ ] No TOTP secret or password material appears in any console log line during the flow.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm --filter @qlm/user-profile test` all pass.

## Notes

- For the `InputOTP` 6-digit input use `@qlm/ui/input-otp` if it exists, otherwise three `Input` slots — confirm during implementation. The legacy console used Shadcn's `InputOTP`.
- The Verify step gets `factorId` from the enroll response; chain via component state, not a separate query.
- Spec anchors: [§3.2.2 MFA setup dialog](../../../specs/0025-user-profile-phase1.md#322-mfa-setup-dialog-modal), [§3.3 F5/F6](../../../specs/0025-user-profile-phase1.md#33-user-flows-happy-paths), [§9 security](../../../specs/0025-user-profile-phase1.md#9-security-checklist).
