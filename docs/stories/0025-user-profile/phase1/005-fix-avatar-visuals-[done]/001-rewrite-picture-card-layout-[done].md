---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/user-profile/src/components/picture-card.tsx
  - packages/features/user-profile/src/components/picture-card.stories.tsx
  - packages/features/user-profile/src/components/name-card.tsx
  - packages/features/user-profile/__tests__/picture-card.test.tsx
  - apps/web/src/lib/i18n/locales/en/user-profile.json
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/user-settings
  expect_console: empty
---

# Rewrite picture card layout

Replace `ImageUploader` usage in `PictureCard` with a self-contained avatar + buttons layout (one circle, no duplicate). Also normalise card-title sizes by adding `text-base` to `<CardTitle>` in both `PictureCard` and `NameCard` so titles render visibly larger than their descriptions.

## Done when

- [ ] `PictureCard` no longer imports `@qlm/ui/image-uploader`. It renders a single `ProfileAvatar` (initials when `pictureUrl` null), a hidden `<input type=file accept="image/*">`, an *Upload* button that triggers it, and a *Clear* button gated on `pictureUrl !== null`.
- [ ] All button labels in `PictureCard` route through `t('userProfile.picture.*')` — including a new `userProfile.picture.upload` key.
- [ ] `<CardTitle>` in `PictureCard` and `NameCard` carries `className="text-base"`.
- [ ] Client-side gates (MIME starts with `image/`, size ≤ 2 MB) and inline error rendering still work — covered by component tests.
- [ ] `picture-card.stories.tsx` updated: `InitialsFallback`, `WithAvatar`, `Uploading` stories all render correctly.
- [ ] `picture-card.test.tsx` updated to query the new buttons and use `fireEvent.change` on the (now self-managed) input. All 5 scenarios pass.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm --filter @qlm/user-profile test` all pass.

## Notes

- Don't modify `packages/ui/src/shadcn/image-uploader.tsx`; other parts of the repo may use it.
- Keep `PictureCardProps` shape stable (`displayName`, `pictureUrl`, `isPending`, `onUpload`, `onClear`) — the consumer in `sections/profile.tsx` doesn't change.
- Spec anchor: [§3.2.1 Profile section](../../../specs/0025-user-profile-phase1.md#321-profile-section-prjsluguser-settings-sidebar--profile).
