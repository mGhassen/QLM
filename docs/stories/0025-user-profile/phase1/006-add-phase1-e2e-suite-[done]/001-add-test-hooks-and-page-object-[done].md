---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/user-profile/src/components/name-card.tsx
  - packages/features/user-profile/src/components/picture-card.tsx
  - packages/features/user-profile/src/components/password-card.tsx
  - packages/features/user-profile/src/components/mfa-card.tsx
  - packages/features/user-profile/src/components/multi-factor-auth-setup-dialog.tsx
  - packages/features/user-profile/src/components/multi-factor-auth-factors-list.tsx
  - apps/e2e/tests/user-profile/user-profile.po.ts
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/user-settings
  expect_console: empty
---

# Add test hooks and page object

Sprinkle stable `data-test` attributes across the four profile cards (and the two MFA dialogs, even though MFA isn't e2e-tested in this story) so e2e selectors don't depend on translated copy. Then create the page object that all four specs in task 002 will share.

## Done when

- [ ] Every interactive element gets a stable `data-test`:
  - `NameCard`: `name-input`, `name-submit`.
  - `PictureCard`: `picture-avatar`, `picture-upload`, `picture-clear`, `picture-input` (the hidden file input).
  - `PasswordCard`: `password-current`, `password-next`, `password-confirm`, `password-submit`, `password-not-linked-banner`.
  - `MfaCard`: `mfa-setup-button`, `mfa-empty-callout`, `mfa-factors-heading`.
  - `MultiFactorAuthSetupDialog`: `mfa-dialog-name`, `mfa-dialog-name-next`, `mfa-dialog-otp`, `mfa-dialog-enable`, `mfa-dialog-cancel`.
  - `MultiFactorAuthFactorsList`: `mfa-factor-row-{id}`, `mfa-factor-remove-{id}`, `mfa-unenroll-password`, `mfa-unenroll-confirm`.
- [ ] New `apps/e2e/tests/user-profile/user-profile.po.ts` exposes:
  - `goToProfile()` — opens user-settings via the topbar dropdown, asserts Profile section is the default.
  - `currentName()`, `setName(value)`, `submitName()`, `expectNameToast()`.
  - `uploadAvatar(filepath, mime)`, `clearAvatar()`, `expectAvatarVisible(boolean)`, `expectAvatarRejection(reason)`.
  - `setPassword({current, next, confirm})`, `submitPassword()`, `expectPasswordError(message)`, `expectPasswordSuccessToast()`.
  - `expectTopbarName(name)` — reads the topbar avatar dropdown trigger.
- [ ] `pnpm typecheck` + `pnpm --filter @guepard/user-profile test` + `pnpm --filter e2e typecheck` all pass.

## Notes

- Mirror the `data-test` style from `apps/e2e/tests/user-tokens/user-tokens.po.ts` (kebab-case, role-prefixed). Don't use `data-testid` — the project rule is `data-test`.
- The page object is a *primitive layer*; specs build flows on top. No assertions inside primitives unless they're tied to a state precondition.
- Spec anchor: [§3.3 user flows](../../../specs/0025-user-profile-phase1.md#33-user-flows-happy-paths).
