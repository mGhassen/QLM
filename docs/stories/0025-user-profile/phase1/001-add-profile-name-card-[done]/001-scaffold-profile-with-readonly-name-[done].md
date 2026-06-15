---
story: ./story.md
status: done
layer: plugin
model: sonnet
files:
  - packages/features/user-profile/package.json
  - packages/features/user-profile/tsconfig.json
  - packages/features/user-profile/eslint.config.mjs
  - packages/features/user-profile/vitest.config.ts
  - packages/features/user-profile/.storybook/main.ts
  - packages/features/user-profile/.storybook/preview.ts
  - packages/features/user-profile/src/index.ts
  - packages/features/user-profile/src/components/user-profile-section.tsx
  - packages/features/user-profile/src/components/name-card.tsx
  - packages/features/user-profile/src/components/name-card.stories.tsx
  - packages/apps/user-settings/src/sections/profile.tsx
  - packages/apps/user-settings/src/plugin-root.tsx
  - pnpm-lock.yaml
validation:
  kind: ui-smoke
  route: /prj/$projectSlug/user-settings
  expect_console: empty
---

# Scaffold profile with read-only name

Stand up the `@guepard/user-profile` feature package, a read-only `NameCard` sourced from `useUser()`, and a new `sections/profile.tsx` registered above **Personal tokens** in the `user-settings` plugin so `/prj/{slug}/user-settings` renders the new section on page load.

## Done when

- [ ] `packages/features/user-profile/` compiles and exports `UserProfileSection` + `NameCard`, following the `packages/features/accounts` package layout (tsconfig, eslint, vitest, Storybook).
- [ ] `NameCard` renders the signed-in user's name read-only (from `useUser()`), with a disabled input placeholder for future editing.
- [ ] `packages/apps/user-settings/src/sections/profile.tsx` exists and is registered as the **first** section in `plugin-root.tsx`, above `personal-tokens`.
- [ ] Navigating to `/prj/$projectSlug/user-settings` shows Profile as the default sidebar item with the read-only Name card visible.
- [ ] `pnpm typecheck` + `pnpm --filter @guepard/user-profile build` pass; no new console errors in the `ui-smoke` run.

## Notes

- Mirror Storybook scaffold from `packages/features/accounts` — do not reinvent config.
- No data writes in this task; editable form + mutation land in task 003.
- Spec anchor: [§3.2.1 Profile section](../../../specs/0025-user-profile-phase1.md#321-profile-section-prjsluguser-settings-sidebar--profile).
