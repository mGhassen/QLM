---
spec: docs/specs/0007-notebook-editor-phase1.md
spec_sections:
  - "#76-shell-app-packagesappsnotebook"
  - "#78-host-appsweb"
  - "#41-layered-sequence-diagrams"
  - "#52-endpoints"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks:
  - 004-build-tabbed-result-panel
  - 006-wire-datasource-provider-logos
  - 007-wire-notebook-header-and-tooltip-provider
blocked_by:
  - 001-wire-tailwind-source-scope
---

# Wire notebook plugin and run path

## Goal

Stand up the `@guepard/app-notebook` shell plugin (default list view, `FlatRoot` editor view, `resolveProjectContext`) and wire its host adapter so a SQL cell's Run round-trips through the existing `/api/notebook/query` Hono endpoint and renders the result in cell state.

## Scope

**In scope**
- `packages/apps/notebook/src/plugin-root.tsx` — `default` list view consuming `shell.notebooks.list / create / delete`, `FlatRoot` editor view consuming `shell.notebooks.getBySlug / update / delete`, `shell.datasources.list`, `shell.query.run`, and managing in-memory `cellResults / cellErrors / cellLoadingStates`.
- `packages/apps/notebook/src/plugin-root.tsx` — `resolveProjectContext` sibling export reading `repositories.notebook.findBySlug` to map a `notebookSlug` URL param to a project id.
- `apps/web/src/shell/run-query.ts` — host `RunQueryFn` adapter posting to `/notebook/query` (matching the server's mount at `apps/server/src/server.ts:137`).

**Out of scope**
- Cell chrome polish → story 003.
- Result panel layout → story 004.
- Datagrid wiring → story 005.
- Datasource logos → story 006.
- Tooltip provider wrap and header → story 007.

## Acceptance criteria

- [x] `packages/apps/notebook/src/plugin-root.tsx` exports `default`, `FlatRoot`, and `resolveProjectContext`.
- [x] The list view renders existing notebooks for the project, allows creating a new notebook, and navigates to the editor on click.
- [x] The editor view loads the notebook by slug, the project's datasources by id, and renders `<NotebookUI>` with `cellResults`, `cellErrors`, `cellLoadingStates`, and `onRunQuery={handleRunQuery}`.
- [x] `handleRunQuery` calls `shell.query.run({ query, datasourceId, conversationId: notebook.id })` and stores the response in `cellResults[cellId]`.
- [x] `apps/web/src/shell/run-query.ts` posts to `/notebook/query` (note: the path matches the Hono mount, not a hyphenated alias).
- [x] `pnpm --filter @guepard/app-notebook exec tsc --noEmit` is clean.

## Tasks

Shipped files:

- `packages/apps/notebook/src/plugin-root.tsx` — list view, editor view, project resolver, in-memory cell-execution state.
- `packages/apps/notebook/src/manifest.ts` — plugin manifest pointing the shell registry at `plugin-root`.
- `apps/web/src/shell/run-query.ts` — POST `'/notebook/query'`.

## Demo / verification

```bash
pnpm web:dev
```

1. Open a project, click **Notebooks** in the sidebar.
2. Create a new notebook → editor opens at `/notebook/{slug}`.
3. Add a query cell, type `select 1;`, pick any datasource, click Run.
4. The cell should display the result. Hitting the network tab should show a single `POST /api/notebook/query` returning `200`.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
