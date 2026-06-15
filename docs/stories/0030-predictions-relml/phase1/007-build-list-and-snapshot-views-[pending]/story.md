---
spec: docs/specs/0030-predictions-relml-phase1.md
spec_sections:
  - "#32-screen-by-screen"
  - "#33-user-flows"
  - "#42-component-split"
  - "#75-presentation--feature-package-packagesfeaturespredictions"
  - "#76-shell-app-packagesappspredictions"
status: pending
started: null
finished: null
blocks: ["009"]
blocked_by: ["002", "006"]
---

# build-list-and-snapshot-views

## Goal

A user can land on `/prj/{slug}/predictions`, see the project's datasource list with snapshot status, take a snapshot with one click, and explore tables / columns / FKs read-only on the resulting snapshot detail page.

## Scope

**In scope**
- Feature components in `packages/features/predictions/src/`:
  - `predictions-list.tsx`, `predictions-card.tsx`.
  - `prediction-snapshot-hero.tsx`.
  - `prediction-schema-panel.tsx` (table list → columns drilldown, mirrors `DatasourceTablesPanel` / `DatasourceColumnsPanel`).
- Plugin-root rewrites in `packages/apps/predictions/src/plugin-root.tsx`:
  - Default export — list view, calls `shell.predictions.snapshots.list()` and `shell.datasources.list()`, renders `PredictionsList`.
  - `FlatRoot` — snapshot detail, fetches snapshot via `shell.predictions.snapshots.get(snapshotId)`, renders hero + tab switcher (Schema active, Ask agent placeholder owned by story 008).
  - `resolveProjectContext` — fetches snapshot → returns `{ projectId: snapshot.projectId }`.
- `packages/apps/predictions/src/use-take-snapshot.ts` — mutation hook: tries `shell.predictions.snapshots.take(datasourceId)`, on 422 fallback to client-side `shell.datasources.metadata(...)` + `takeFromClient`.
- Storybook stories under `packages/features/predictions/src/__stories__/` — at least one per component, with realistic mock data.
- All visuals follow `.claude/rules/design-system.md` recipes (`rounded-none`, `border-2`, `font-black uppercase tracking-widest`).

**Out of scope**
- Agent chat panel — story 008 owns it (the tab is wired but the body is a placeholder).
- i18n keys — story 009 owns extraction; placeholder strings here are TODO-marked.

## Acceptance criteria

- [ ] `/prj/{slug}/predictions` renders the datasource list; cards show snapshot status, "Take snapshot" / "Open latest" actions.
- [ ] Clicking "Take snapshot" navigates to `/prediction-snapshot/{id}` and the hero + Schema tab populate from the snapshot.
- [ ] Schema tab supports table → columns drilldown without touching `driver.metadata()` again (reads from snapshot only).
- [ ] Browser-runtime datasources fall back to `takeFromClient` automatically and still produce a snapshot.
- [ ] `pnpm --filter @qlm/features-predictions storybook` opens; at least one story renders per new component.
- [ ] `pnpm typecheck && pnpm lint` are green.

## Tasks

Populated by `/start-story`.

## Demo / verification

```bash
pnpm dev
```

Sign in, open a project, navigate to **Predictions**, take a snapshot of any datasource, click into it, drill into a table, see columns + FK relationships listed.

## Questions surfaced

-

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
