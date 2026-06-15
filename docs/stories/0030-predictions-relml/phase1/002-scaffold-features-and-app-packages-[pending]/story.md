---
spec: docs/specs/0030-predictions-relml-phase1.md
spec_sections:
  - "#75-presentation--feature-package-packagesfeaturespredictions"
  - "#76-shell-app-packagesappspredictions"
  - "#31-information-architecture"
status: pending
started: null
finished: null
blocks: ["007", "008"]
blocked_by: []
---

# scaffold-features-and-app-packages

## Goal

Stand up empty `@guepard/features-predictions` and `@guepard/app-predictions` packages so the Predictions sidebar entry appears in the project shell with a placeholder view.

## Scope

**In scope**
- New package `packages/features/predictions` — `package.json`, `tsconfig.json`, `eslint.config.mjs`, `src/index.ts` (empty barrel).
- New package `packages/apps/predictions` — `package.json`, `tsconfig.json`, `src/index.ts` (re-exports manifest + plugin-root).
- `packages/apps/predictions/src/manifest.ts` — `PluginManifest` with `id: 'predictions'`, `routeBase: 'predictions'`, `projectTopLevelAppBucketId: 'ai'`, `flatRoute: { prefix: 'prediction-snapshot', params: ['snapshotId'] }`, sidebar nav entry, `enabled: true`.
- `packages/apps/predictions/src/plugin-root.tsx` — default export rendering an industrial-styled placeholder ("Predictions — coming online"); `FlatRoot` placeholder; `resolveProjectContext` stub returning `null`.
- Verify auto-discovery via `apps/web/src/shell/app-registry.ts` Vite glob (no host edits required, but smoke-test that the sidebar entry shows up).

**Out of scope** (forces honest slicing)
- Real list view + snapshot detail — story 007.
- Agent panel — story 008.
- i18n keys — story 009 (placeholder strings here are explicitly marked TODO).

## Acceptance criteria

- [ ] `pnpm install` followed by `pnpm typecheck` is green.
- [ ] In `pnpm web:dev`, opening any project shows a "Predictions" entry in the sidebar under the AI bucket.
- [ ] Clicking it navigates to `/prj/{slug}/predictions` and renders the placeholder.
- [ ] Visiting `/prediction-snapshot/abc` renders the flat-root placeholder (no error).
- [ ] No new i18n keys are introduced — placeholder copy is hardcoded with a TODO comment pointing at story 009.

## Tasks

Populated by `/start-story`.

## Demo / verification

```bash
pnpm install
pnpm typecheck
pnpm web:dev
```

Open `http://localhost:3000`, sign in, open a project, confirm the **Predictions** sidebar entry under **AI**, click it, see the placeholder.

## Questions surfaced

-

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
