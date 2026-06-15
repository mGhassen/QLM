---
spec: docs/specs/0003-environments-phase1.md
spec_sections:
  - "#75-presentation--feature-package-packagesfeaturesenvironments"
  - "#76-shell-app-packagesappsenvironments"
  - "#42-component-split"
status: pending
started: null
finished: null
blocks:
  - "002-define-display-types-and-fixtures"
  - "003-seed-environments-i18n-namespace"
  - "004-add-is-source-datasources-column"
blocked_by: []
---

# Scaffold environments packages

## Goal

Create empty `packages/features/environments` and `packages/apps/environments` packages, register the shell plugin, and see an "Environments" entry appear in the project sidebar rendering a placeholder page.

## Scope

**In scope**

- Create `packages/features/environments/` with `package.json`, `tsconfig.json`, `vitest.config.ts`, empty `src/index.ts`. Mirror the shape of `packages/features/notebook/`.
- Create `packages/apps/environments/` with `package.json`, `tsconfig.json`, `src/index.ts`, `src/manifest.ts`, `src/plugin-root.tsx` (placeholder). Mirror the shape of `packages/apps/notebook/`.
- `manifest.ts` mirrors `packages/apps/notebook/src/manifest.ts` shape: `id: 'environments'`, `displayName: 'Environments'`, `icon: 'SquareTerminal'`, `layer: 'project'`, `routeBase: 'environments'`, `projectTopLevelAppBucketId: 'ops'`, `flatRoute: { prefix: 'env', params: ['sourceSlug'] }`, `nav: { slot: 'project.topLevelNav', primary: { label: 'Environments', icon: 'SquareTerminal', order: 15 } }`, `enabled: true`.
- `plugin-root.tsx` default export returns a trivial placeholder page (one localized heading) — no real components yet.
- Add `@guepard/environments` and `@guepard/apps-environments` (or whatever the target names resolve to) to `apps/web/package.json`.
- Verify the Vite-glob registry (`apps/web/src/shell/app-registry.ts`) picks up the new plugin **without any hand-edit to that file**.

**Out of scope** (forces honest slicing)

- Any real components — primitives, cards, graph, inspector (→ Stories 005–008)
- Any display types or fixture module (→ Story 002)
- Any i18n keys beyond a single placeholder key (→ Story 003)
- Any schema change (→ Story 004)
- Any routing helper in `paths.config.ts` (→ Stories 006 and 009)

## Acceptance criteria

- [ ] `pnpm install` succeeds after adding the two new packages.
- [ ] `pnpm typecheck` passes across both new packages and `apps/web`.
- [ ] `pnpm web:dev` runs and the project sidebar shows "Environments" under the `ops` bucket.
- [ ] Clicking "Environments" navigates to `/prj/{slug}/environments` and renders the placeholder page without errors.
- [ ] The plugin is discovered by `apps/web/src/shell/app-registry.ts` automatically — no edits to that file are needed.
- [ ] The placeholder page contains no hardcoded English strings. Even the single placeholder line uses `t(...)` with a key that Story 003 later fleshes out.
- [ ] `packages/apps/environments/src/manifest.ts` imports `PluginManifest` from `@guepard/shell-contracts/manifest` matching the notebook pattern.
- [ ] `packages/features/environments/package.json` exposes a `./types` export pointing at `./src/types/index.ts` even though that file is empty for now, so Story 002 can fill it without another package-boundary change.

## Tasks

Populated by `/start-story`. Each entry links to a sibling task file in this folder.

1. [001-…](001-<slug>-[pending].md)
2. [002-…](002-<slug>-[pending].md)

## Demo / verification

```bash
pnpm install
pnpm typecheck
pnpm web:dev
# In a browser:
# 1. Sign in, enter any project.
# 2. Confirm "Environments" appears in the project sidebar under the `ops` bucket.
# 3. Click it.
# 4. URL changes to /prj/{slug}/environments.
# 5. Placeholder page renders.
```

## Questions surfaced

Propagated to the spec's resolved-questions table by `/finish-story`. Empty is the common case.

- _(empty)_

## Spec-accuracy check

Set by `/finish-story`. Valid values: `yes` / `no + one-line reason`. `no` triggers a `Changelog` line in the spec.

- [ ] The referenced spec sections still match the implementation as shipped.
