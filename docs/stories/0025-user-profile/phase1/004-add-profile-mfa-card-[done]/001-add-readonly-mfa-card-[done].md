---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/user-profile/src/components/mfa-card.tsx
  - packages/features/user-profile/src/components/mfa-card.stories.tsx
  - packages/features/user-profile/src/components/user-profile-section.tsx
  - packages/features/user-profile/src/components/index.ts
  - packages/features/user-profile/src/index.ts
  - packages/features/user-profile/package.json
  - packages/apps/user-settings/src/sections/profile.tsx
  - apps/web/src/lib/i18n/locales/en/user-profile.json
  - pnpm-lock.yaml
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/user-settings
  expect_console: empty
---

# Add read-only MFA card

Land the UI-visible MFA card below `PasswordCard`. Reads existing factors via `useFetchAuthFactors()` from `@guepard/supabase` (already in repo). Renders the empty-state callout when no factors are enrolled, or a list of factor names when there are. *Setup a new Factor* button is **disabled** in this task — task 003 wires the enrollment dialog.

## Done when

- [ ] `MfaCard` component renders inside `UserProfileSection` below `PasswordCard`.
- [ ] When `useFetchAuthFactors().data?.totp` is empty, shows the secure-your-account callout (icon + title + description) plus a disabled *Setup a new Factor* button.
- [ ] When factors exist, renders a list of `friendly_name` rows (no unenroll affordance yet).
- [ ] All strings route through `t('userProfile.mfa.*')` — minimal i18n keys: `title`, `description`, `emptyCalloutTitle`, `emptyCalloutDescription`, `setupButton`, `factorsHeading`.
- [ ] Storybook stories: `Empty`, `WithOneFactor`, `WithMultipleFactors`.
- [ ] `pnpm typecheck` + `pnpm --filter @guepard/user-profile test` pass.

## Notes

- `useFetchAuthFactors()` lives at `packages/supabase/src/hooks/use-fetch-mfa-factors.ts`; add `@guepard/supabase` as a dep on the user-profile package if not already there.
- No mutation in this task; the `Setup` button stays disabled until task 003.
- Spec anchor: [§3.2.1 MFA card row](../../../specs/0025-user-profile-phase1.md#321-profile-section-prjsluguser-settings-sidebar--profile).
