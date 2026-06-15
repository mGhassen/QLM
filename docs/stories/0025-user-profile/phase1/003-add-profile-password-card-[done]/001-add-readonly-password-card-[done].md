---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/user-profile/src/components/password-card.tsx
  - packages/features/user-profile/src/components/password-card.stories.tsx
  - packages/features/user-profile/src/components/user-profile-section.tsx
  - packages/features/user-profile/src/components/index.ts
  - packages/features/user-profile/src/index.ts
  - packages/apps/user-settings/src/sections/profile.tsx
  - apps/web/src/lib/i18n/locales/en/user-profile.json
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/user-settings
  expect_console: empty
---

# Add read-only password card

Land the UI-visible Password card below `NameCard`. Form is a static, **disabled** placeholder for now (3 fields: current/new/confirm + submit) — the actual mutation lands in task 003. For OAuth-only users, render the `userProfile.password.noIdentityLinked` banner instead of the form.

## Done when

- [ ] `PasswordCard` component renders inside `UserProfileSection` between `NameCard` and (future) MFA card.
- [ ] When `isProviderConnected('email') === true` (default branch in story-1 wiring), shows three disabled `Input[type=password]` fields with their labels and a disabled *Update Password* submit button.
- [ ] When `isProviderConnected('email') === false`, shows the warning banner from `userProfile.password.noIdentityLinked` and no form.
- [ ] All strings route through `t('userProfile.password.*')` — no hardcoded English.
- [ ] New i18n keys: `userProfile.password.{title,description,current,next,confirm,submit,noIdentityLinked}`.
- [ ] Storybook stories for `Linked` and `OauthOnly` variants.
- [ ] `pnpm typecheck` + `pnpm --filter @guepard/user-profile test` pass.

## Notes

- Wiring `isProviderConnected` resolution (via `useUserIdentities()`) lands in task 003. For now, accept it as a prop on `PasswordCard` (default `true`) and pass `true` literally from `sections/profile.tsx`.
- No re-auth field yet; that's task 003.
- Spec anchors: [§3.2.1 Password card](../../../specs/0025-user-profile-phase1.md#321-profile-section-prjsluguser-settings-sidebar--profile), [§1 Q#3](../../../specs/0025-user-profile-phase1.md#1-resolved-open-questions).
