---
spec: docs/specs/0024-global-shell-ui-phase1.md
spec_sections:
  - "#75-presentation--feature-packages"
  - "#76-shell-apps-packagesapps"
  - "#12-implementation-sequencing"
started: 2026-04-18
finished: 2026-04-18
status: done
blocks:
  - "008-build-topbar-dropdown"
  - "009-migrate-settings-to-apps"
blocked_by: []
---

# Scaffold shell packages

## Goal

Stand up the empty feature and app packages the rest of phase 1 depends on, so subsequent stories can import from real paths instead of inventing them.

## Scope

**In scope**
- New package `packages/features/shell-topbar` with barrel exports, eslint config, tsconfig, vitest config, and an empty Storybook scaffold mirroring `packages/features/accounts`.
- New package `packages/apps/project-settings` with `src/manifest.ts` + empty `src/plugin-root.tsx` that mounts `SettingsShell` with a placeholder "General" section.
- New package `packages/apps/org-settings` with `src/manifest.ts` + empty `src/plugin-root.tsx` that mounts `SettingsShell` with placeholder sections (`general`, `members`, `billing`, `usage`).
- Register both new apps in `apps/web/src/shell/app-registry.ts`.

**Out of scope**
- Actual dropdown UI (story 008).
- Settings content (story 009).
- i18n wiring (story 002).
- Any domain or server work.

## Acceptance criteria

- [x] `pnpm --filter @qlm/shell-topbar typecheck` passes (package has its own typecheck script; builds clean).
- [x] `packages/apps/project-settings` (`@qlm/app-project-settings`) compiles as part of the monorepo typecheck — app packages follow the `@qlm/app-*` convention and rely on the root turbo typecheck pipeline.
- [x] `packages/apps/org-settings` (`@qlm/app-org-settings`) compiles as part of the monorepo typecheck.
- [x] The two new apps are visible via `app-registry.ts`'s existing `import.meta.glob('../../../../packages/apps/*/src/manifest.ts')` — no hand-rolled registry entries.
- [x] `packages/features/shell-topbar` ships a Storybook story (`src/topbar-trigger.stories.tsx`) consumable by the monorepo Storybook host at `tooling/storybook`.
- [x] Monorepo-wide `pnpm typecheck` stays green (49/49 tasks).
- [x] Settings apps (`project-settings`, `org-settings`) do **not** appear in the project sidebar — verified manually on the live preview at `http://localhost:3100`. Reachable only via the topbar dropdown once story 008 ships.

## Tasks

1. [001-scaffold-shell-topbar-package](001-scaffold-shell-topbar-package-[done].md)
2. [002-scaffold-project-settings-app](002-scaffold-project-settings-app-[done].md)
3. [003-scaffold-org-settings-app](003-scaffold-org-settings-app-[done].md)
4. [004-register-new-apps-in-registry](004-register-new-apps-in-registry-[done].md)

## Demo / verification

```
pnpm install
pnpm typecheck
pnpm --filter @qlm/shell-topbar storybook
```

Expect: storybook launches; both new app packages build without errors.

## Questions surfaced

## Notes

- Scaffolding tasks added `pnpm-lock.yaml` to their `files:` allowlist — scaffolding a new workspace package inherently touches the root lock file.
- App packages follow the `@qlm/app-<name>` convention (matches `app-notebook`, `app-datasources`, …); settings apps use `project.overflow` slot so they don't appear in the primary project nav (surfaced via the topbar dropdown in story 008).
- Task 004 un-skipped: the registry's glob discovered the apps, but `getNavGroups()` was still rendering them in the sidebar because it honored only `projectTopLevelAppBucketId === 'dashboard'` not `nav.slot === 'project.overflow'`. One-line filter added.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.
