---
story: ./story.md
status: done
layer: plugin
model: sonnet
files:
  - packages/apps/project-settings/**
  - pnpm-lock.yaml
validation:
  kind: typecheck-only
---

# Scaffold project-settings app

Create `packages/apps/project-settings` as a new shell app plugin with a manifest and a placeholder `plugin-root.tsx` that mounts `SettingsShell` (from `packages/features/settings-shell`) with a single placeholder General section.

## Done when

- [x] `packages/apps/project-settings/package.json` declares `@qlm/app-project-settings` (consistent with `@qlm/app-notebook`, etc.) with `@qlm/settings-shell` as a dep.
- [x] `src/manifest.ts` exports a `PluginManifest` with `id: 'project-settings'`, `routeBase: 'project-settings'`, a human label, and an icon.
- [x] `src/plugin-root.tsx` default-exports a React component that renders `SettingsSidebar` (from `@qlm/settings-shell`) with a single placeholder General section.
- [x] Monorepo-wide `pnpm typecheck` stays green (49/49 tasks).

## Notes

- Follow the shape of `packages/apps/notebook` for the manifest + plugin-root pair.
- Hardcoded English placeholders are acceptable here; story 002 replaces them with `t()` calls.
