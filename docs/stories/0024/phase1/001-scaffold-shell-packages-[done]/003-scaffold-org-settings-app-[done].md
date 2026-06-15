---
story: ./story.md
status: done
layer: plugin
model: sonnet
files:
  - packages/apps/org-settings/**
  - pnpm-lock.yaml
validation:
  kind: typecheck-only
---

# Scaffold org-settings app

Create `packages/apps/org-settings` as a new shell app plugin with a manifest and a placeholder `plugin-root.tsx` that mounts `SettingsShell` with four placeholder sections (General, Members, Billing, Usage).

## Done when

- [x] `packages/apps/org-settings/package.json` declares `@qlm/app-org-settings` (matches the `app-<name>` convention) with `@qlm/settings-shell` as a dep.
- [x] `src/manifest.ts` exports a `PluginManifest` with `id: 'org-settings'`, `routeBase: 'org-settings'`, a human label, and the `Building2` icon.
- [x] `src/plugin-root.tsx` default-exports a React component that renders `SettingsSidebar` with sections `[general, members, billing, usage]` (placeholder copy; content migration happens in story 009).
- [x] Monorepo-wide `pnpm typecheck` stays green (49/49 tasks).

## Notes

- Mirror the shape from task 002 for consistency.
- Section components are placeholders — empty `<div>`s are fine; i18n + real content land in later stories.
