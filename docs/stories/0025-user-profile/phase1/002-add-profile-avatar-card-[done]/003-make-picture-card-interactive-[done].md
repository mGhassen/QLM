---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/user-profile/src/components/picture-card.tsx
  - packages/features/user-profile/src/components/picture-card.stories.tsx
  - packages/features/user-profile/__tests__/picture-card.test.tsx
  - packages/apps/user-settings/src/sections/profile.tsx
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/user-settings
  expect_console: empty
---

# Make picture card interactive

Replace the read-only `PictureCard` with an `ImageUploader` + Clear button bound to `shell.personalAccount.uploadAvatar` / `clearAvatar`. Client-side gates: image MIME (`image/*`) and size ≤ 2 MB. Storybook covers idle / uploading / error.

## Done when

- [ ] Selecting a valid image fires `useMutation(shell.personalAccount.uploadAvatar)`; the new picture appears in `PictureCard` and in the topbar (already wired via shared query key in story 001).
- [ ] *Clear* button calls `shell.personalAccount.clearAvatar()` and reverts to initials.
- [ ] Files >2 MB or non-`image/*` MIME types are rejected client-side with an inline error; no network call is made.
- [ ] Toast keys: `userProfile.picture.updating` (loading), `userProfile.picture.updated` (success), `userProfile.picture.error` (failure).
- [ ] Storybook stories: `Idle`, `Uploading`, `Error`. Component tests cover state transitions.
- [ ] All writes go through `useShell()`; no `client.storage.from(...)` import in the feature package.
- [ ] `pnpm typecheck` + `pnpm --filter @qlm/user-profile test` pass.

## Notes

- `ImageUploader` already exists in `@qlm/ui/image-uploader` (used by the legacy console reference).
- File-size gate is enforced in the `onValueChange` handler before calling `uploadAvatar`.
- Spec anchors: [§3.3 F2/F3](../../../specs/0025-user-profile-phase1.md#33-user-flows-happy-paths), [§9 security checklist](../../../specs/0025-user-profile-phase1.md#9-security-checklist).
