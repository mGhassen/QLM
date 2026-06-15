---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/features/user-profile/src/components/name-card.tsx
  - packages/features/user-profile/src/components/name-card.stories.tsx
  - packages/features/user-profile/__tests__/name-card.test.tsx
  - packages/apps/user-settings/src/sections/profile.tsx
  - packages/ui/src/qlm/shell/shell-user-profile-menu.tsx
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/user-settings
  expect_console: empty
---

# Make name card editable and propagate

Swap the read-only `NameCard` for a RHF form bound to `shell.personalAccount.updateMine`, and switch the topbar user-profile menu to consume the same `['personal-account', userId]` query key so a name update reflects everywhere without a page reload.

## Done when

- [ ] `NameCard` renders a RHF form with a single `Input` + *Update Profile* submit button, wired to `shell.personalAccount.updateMine({ name })` via `useMutation`.
- [ ] Submitting an empty name shows the inline `userProfile.name.required` error; the adapter is not called.
- [ ] Submitting a non-empty name fires the mutation, shows a toast keyed to `userProfile.name.updated`, and invalidates `['personal-account', userId]`.
- [ ] `packages/ui/src/qlm/shell/shell-user-profile-menu.tsx` reads the signed-in user's name from the shared query key (not directly from `useUser()`) so updates propagate without reload.
- [ ] Storybook stories cover: loading, idle-editable, submitting, error; `pnpm --filter @qlm/user-profile storybook build` succeeds.
- [ ] Component tests in `__tests__/name-card.test.tsx` cover the three interactive states.
- [ ] Navigating `/prj/$projectSlug/user-settings`, editing the name, and clicking *Update Profile* shows the new name in the topbar without reload; console stays clean.

## Notes

- All strings must route through `t('userProfile.name.*')` — ESLint enforces `@qlm/ui/trans` for JSX-embedded cases.
- Topbar swap: the existing hook usage is in `shell-user-profile-menu.tsx`; replace the direct `useUser()` read of the display name with a `useQuery(['personal-account', userId])` backed by `shell.personalAccount.getMine()`.
- Spec anchors: [§3.3 F1](../../../specs/0025-user-profile-phase1.md#33-user-flows-happy-paths), [§1 Q#1 resolution](../../../specs/0025-user-profile-phase1.md#1-resolved-open-questions).
