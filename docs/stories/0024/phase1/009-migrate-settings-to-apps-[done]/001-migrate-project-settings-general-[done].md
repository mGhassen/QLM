---
story: ./story.md
status: done
layer: features
model: sonnet
files:
  - packages/apps/project-settings/src/plugin-root.tsx
  - packages/apps/project-settings/src/sections/general.tsx
  - packages/apps/project-settings/src/sections/general.stories.tsx
  - packages/apps/project-settings/package.json
  - apps/web/src/lib/i18n/locales/en/project-settings.json
  - tooling/storybook/.storybook/main.ts
validation:
  kind: typecheck-only
---

# Migrate project-settings General section

Builds a General section for `project-settings` that renames the current project (name + slug) via `useShell().projects`, mounted by the plugin-root through `SettingsShell`.

## Done when

- [ ] `packages/apps/project-settings/src/sections/general.tsx` renders a form bound to the current project, wired through `useShell().projects.update` (or the equivalent existing resource method).
- [ ] Plugin-root mounts `SettingsShell` with a single `general` section and no hardcoded placeholder.
- [ ] A Storybook story covers default, loading, and error states for the section.
- [ ] All user-facing strings go through `t(...)` with keys added to `packages/i18n/src/locales/en/project-settings.json`.
- [ ] `pnpm typecheck` is green.

## Notes

- Reuse the project-update resource already exposed by `@qlm/shell-runtime` — do not add a new shell resource for this task.
- The rename form is the only surface here; API keys / env vars / danger zone are phase 2 and explicitly out of scope.
