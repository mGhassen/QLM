---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/user-profile/src/components/picture-card.tsx
  - packages/features/user-profile/src/components/picture-card.stories.tsx
  - packages/features/user-profile/src/components/user-profile-section.tsx
  - packages/features/user-profile/src/index.ts
  - packages/apps/user-settings/src/sections/profile.tsx
  - apps/web/src/lib/i18n/locales/en/user-profile.json
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/user-settings
  expect_console: empty
---

# Add read-only picture card

Show the current `accounts.picture_url` (or initials fallback) inside a new `PictureCard` rendered above the Name card on `/prj/{slug}/user-settings`. No upload behaviour yet — that lands in task 003.

## Done when

- [ ] `PictureCard` renders the current avatar via `ProfileAvatar` (initials when `pictureUrl` is null).
- [ ] `UserProfileSection` shows `PictureCard` *before* `NameCard`.
- [ ] `sections/profile.tsx` passes `pictureUrl` from `shell.personalAccount.getMine()` to `UserProfileSection`.
- [ ] Storybook story covers `withAvatar` + `initialsFallback`.
- [ ] Minimal i18n keys added: `userProfile.picture.title`, `userProfile.picture.description`.
- [ ] `pnpm typecheck` + `pnpm --filter @guepard/user-profile test` pass.

## Notes

- Read-only: no `ImageUploader`, no upload mutation, no Clear button. Task 003 wires those.
- `ProfileAvatar` already exists in `@guepard/ui/avatar` and supports both `pictureUrl` and `displayName` for initials.
- Spec anchor: [§3.2.1 Profile section](../../../specs/0025-user-profile-phase1.md#321-profile-section-prjsluguser-settings-sidebar--profile).
