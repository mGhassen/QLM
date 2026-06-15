---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/apps/org-settings/src/plugin-root.tsx
  - packages/apps/org-settings/src/sections/general.tsx
  - packages/apps/org-settings/src/sections/general.stories.tsx
  - packages/apps/org-settings/src/sections/members.tsx
  - packages/apps/org-settings/src/sections/members.stories.tsx
  - packages/apps/org-settings/package.json
  - apps/web/src/lib/i18n/locales/en/org-settings.json
  - packages/shell-runtime/src/resources/team-members.ts
  - packages/shell-runtime/src/client.ts
validation:
  kind: typecheck-only
---

# Migrate org-settings General and Members sections

Builds the first two sections of the `org-settings` SettingsShell: General (org rename) and Members (wraps `@guepard/features/accounts` members + invitations UI migrated from the deleted `/org/$slug/members` route).

## Done when

- [ ] `sections/general.tsx` renders an org rename form wired through the existing org-update resource.
- [ ] `sections/members.tsx` composes `AccountMembersTable` and `InviteMembersDialogContainer` from `@guepard/accounts/components` against the current org.
- [ ] Plugin-root mounts `SettingsShell` with `general` and `members` sections (billing + usage arrive in task 003).
- [ ] Storybook stories cover default, loading, and error states for each section.
- [ ] All user-facing strings go through `t(...)` with keys added to `apps/web/src/lib/i18n/locales/en/org-settings.json`.
- [ ] `pnpm typecheck` is green.

## Notes

- Members content should be a thin wrapper — do not restyle or reshape the tables; the feature package owns the layout.
- Reference the deleted `apps/web/src/routes/org/$slug/members.tsx` (`git show` its pre-delete commit) for the exact component composition the route used.
