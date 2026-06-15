# RFC 0007 — Notebook editor

| Field      | Value                                                                       |
| ---------- | --------------------------------------------------------------------------- |
| Status     | Accepted — phase 1 shipped 2026-04-11                                       |
| Author     | Hani Chalouati                                                              |
| Created    | 2026-04-11                                                                  |
| Target     | Phase 1 — interactive SQL/Markdown/Prompt notebooks against any datasource  |
| Supersedes | —                                                                           |
| Related    | —                                                                           |

## 1. Summary

Introduce a **notebook editor** primitive in `qlm-console-v3` so users can author cells, run SQL queries against any configured datasource, and read tabular results inside the project shell — without leaving the app for an external SQL client. A notebook is a project-scoped document made of an ordered list of cells. Each cell is one of three types: a **query cell** (SQL editor + Run button + result viewer), a **markdown cell** (rich text), or a **prompt cell** (free-form prompt for the agent surface, deferred to a later phase).

Phase 1 ships:

- A `@qlm/notebook` feature package owning the presentational shell — `NotebookList`, `NotebookUI`, `NotebookCell`, `CellDivider`, `NotebookDataGrid`.
- A `@qlm/app-notebook` plugin under `packages/apps/notebook` exposing the standard `default` (list view), `FlatRoot` (editor view), and `resolveProjectContext` sibling exports the shell registry consumes.
- Cell affordances at parity with `qwery-core`: language badges, hover-tooltipped footer toolbar, More-menu cell operations including Duplicate, an always-visible `+` insertion affordance on every cell divider, and a Run button whose disabled state explains itself.
- A single tabbed result panel (`Table | Graphs | API | Data App | Report`) inside each query cell. Only the `Table` tab is functional in phase 1; the other four are placeholder slots reserved for later phases. The panel auto-fits its content height between 140 px and 480 px so a one-row result does not waste a screen of vertical space.
- A virtualised `DataGrid` rendering for the `Table` tab via a thin `NotebookDataGrid` wrapper around `@qlm/ui/qlm/datagrid` — the same component the design-system Storybook story showcases. The wrapper supplies the row-number column, the header strip with `Query Results · ⏱ … rows`, and full-result-set CSV export and clipboard copy actions.
- A datasource selector inside each query cell that renders the brand logo of the registered provider (postgres, mongo, s3, …) by resolving icons from `ExtensionsRegistry`.
- An `unsaved` indicator next to the notebook title driven by the `hasUnsavedChanges` prop on `NotebookUI`.
- The plumbing required for the above to actually render: the host's Tailwind v4 source scope must include `packages/features` and `packages/apps` so utility classes used inside plugin packages are emitted, and `NotebookUI`'s subtree must be wrapped in a `TooltipProvider` so the new Radix-based tooltips have a parent context.
- The host wiring required for Run to round-trip: the existing `/api/notebook/query` Hono endpoint is invoked through `shell.query.run({ query, datasourceId, conversationId })`, with the host's `runQueryAgainstDatasource` adapter posting to that exact path.

What this phase explicitly does not ship is in §3.2.

## 2. Motivation

The console's first job is to let a user connect a datasource and ask questions of it. Today the user can connect a datasource (RFC for datasources is its own slice) and view its schema, but there is no in-app surface to **run** anything against it — the user has to context-switch to a third-party SQL client, paste credentials, and lose every benefit the console provides (auth context, project scoping, shared datasource configuration).

A notebook editor is the smallest workspace surface that fixes this. It is more useful than a single ad-hoc SQL pane because cells persist, are ordered, and combine SQL with narrative markdown — the same shape that has made notebooks the dominant idiom in data exploration tooling for a decade. It is less ambitious than a full BI app because phase 1 only ships the editor and the table view; chart authoring, dashboards, sharing, and embeddable apps belong to later phases that can lean on the same cell primitive.

The secondary motivation is to **establish the second non-trivial app plugin** in the console (after datasources) and exercise the shell-app contract end-to-end: sibling exports on `plugin-root.tsx`, `useShell()` resource consumption, project-context resolution from a flat URL slug, and clean separation between the presentational `packages/features/<name>` and the plugin glue `packages/apps/<name>`. Anything we discover here informs every future plugin.

This RFC has no upstream dependency on a prior RFC. Downstream, it is a prerequisite for any future "Charts", "Dashboards", or "Notebook sharing" RFC, and for the eventual Agent integration (which will reach into cells via the same primitives this phase defines).

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

Each goal is an observable exit criterion.

- **List and create notebooks per project.** A user lands on `/prj/{projectSlug}/notebook`, sees the project's notebooks, can create a new one with one click, and is navigated to its editor at `/notebook/{notebookSlug}`.
- **Edit cells of three types.** A query cell renders a CodeMirror SQL editor; a markdown cell renders a `react-markdown` preview/edit toggle; a prompt cell renders a textarea reserved for the agent surface. All three can coexist in any order in a notebook.
- **Reorder, duplicate, delete cells.** Drag-and-drop reordering via dnd-kit. The cell footer's More menu exposes Move up, Move down, Duplicate, and Full view. The footer also has a one-click Delete button.
- **Insert cells from the divider.** Every divider between cells (and the trailing divider at the bottom) shows a baseline `+` marker at rest and fans out into three typed buttons (Code / Markdown / Prompt) on hover.
- **Run a SQL cell end-to-end.** Pick a datasource from the in-cell selector, click Run, the query is dispatched through `shell.query.run({ query, datasourceId, conversationId: notebookId })`, the host posts `/api/notebook/query`, the server resolves the datasource and runs the query through the registered node driver, and the result renders inside the cell.
- **Single result render per cell.** Exactly one tabbed result panel per cell, exactly one error panel per cell. No duplicate stacks.
- **Auto-fit result panel.** The Table tab's panel height is `clamp(140, chrome + visibleRows × 40, 480)` where `visibleRows = min(rows.length, 10)`. Other tabs use a fixed 400 px since their content size is unknown in phase 1.
- **Storybook-grade `DataGrid`.** The Table tab renders through `DataGrid` from `@qlm/ui/qlm/datagrid` — virtualised, row-numbered, with a header strip showing `Query Results · ⏱ … rows` and Export CSV + Copy page actions.
- **Full-result CSV export.** Clicking Export CSV downloads a `.csv` of every row in the current result set, not just the visible page. Copy page copies the same content to the clipboard.
- **Tooltipped affordances.** Every cell-footer icon has a tooltip. The Run button's tooltip explains the disabled state ("Select a datasource to run") so users learn the requirement instead of guessing.
- **Cell-type badge.** Each query cell's header shows a small `SQL` pill next to "Cell N"; markdown and prompt cells render their own visible bodies and need no extra badge in phase 1.
- **Datasource brand logos.** The in-cell datasource selector reads `ExtensionsRegistry.get(provider)?.icon` and renders the SVG. Two-letter initials remain only as a fallback for providers not in the registry.
- **Unsaved indicator.** A yellow dot appears next to the notebook title while a save mutation is in flight.
- **Title editing.** A pencil button is always subtly visible next to the title (60% opacity at rest, 100% on hover). Clicking it inlines an Input.
- **Build pipeline correctness.** Tailwind v4's `@source` scope in `apps/web/styles/global.css` must include every package whose `.tsx` files use utility classes — concretely `packages/ui/src`, `packages/features`, and `packages/apps`. Otherwise arbitrary values like `bg-[#ffcb51]`, `pl-16`, `pr-12` are silently dropped from the generated stylesheet.
- **i18n hygiene.** Every user-facing string introduced by this RFC goes through `useTranslation('notebooks')` against keys in `apps/web/src/lib/i18n/locales/en/notebooks.json`.

### 3.2 Non-goals (phase 1)

- **Chart authoring.** The `Graphs` tab renders a "coming soon" placeholder. **Phase 2.**
- **API view.** The `API` tab renders a placeholder; phase 2 will define the contract for exposing a query as a callable endpoint.
- **Data App view.** Same — placeholder slot reserved for a phase that ships the Data App primitive.
- **Report view.** Hooked to `ReportRenderer` / `ResultReportView` from `@qlm/ui/qlm/report` if `reportContent` is supplied; phase 1 does not produce reports automatically.
- **SQL autocomplete and schema-aware IntelliSense.** The CodeMirror grammar stays at the basic SQL extension. **Phase 2.**
- **Auto-save state machine.** Saves fire per change through `updateNotebookMutation`. The unsaved-yellow-dot uses `mutation.isPending` as a proxy for "in flight". A real dirty/clean machine is **Phase 2**.
- **Run-all-cells.** Each cell still runs in isolation. **Phase 2.**
- **Output export beyond CSV.** No JSON, no Parquet, no copy-as-Markdown. **Phase 2.**
- **Variables panel and cross-cell references.** **Phase 2.**
- **A real SQL formatter.** `handleFormatCell` trims whitespace as a stub. **Phase 2.**
- **Agent sidebar integration.** The notebook header has no Agent affordance in phase 1. The agent surface is its own RFC, and its hooks into the notebook (cell context injection, run-with-agent) live there.
- **Cell collapsing / folding / output virtualisation.** **Phase 2.**
- **Per-locale notebook content.** English-only. **Phase 2.**
- **Notebook e2e Playwright coverage.** Auth and org flows have e2e under `apps/e2e/tests/`; notebook coverage gets its own slice once the surface is stable. **Phase 2.**
- **i18n migration of pre-existing strings inside `notebook-cell.tsx`.** Strings like `'Cell title…'` and `'Edit title'` predate this RFC; this slice introduces no new ones but does not retroactively migrate the old ones. **Phase 2.**

## 4. Prior art in the codebase

- **Reused** — `@tanstack/react-router` flat routing convention for plugin URLs. The notebook editor uses `/notebook/{notebookSlug}` as a flat route, identical to how the datasources plugin uses `/datasource/{slug}`.
- **Reused** — `@qlm/shell-runtime` `useShell()` and the `query` resource, which already wraps a host-supplied `runQuery` function. The notebook is a consumer; no new resource is added in this RFC.
- **Reused** — `apps/web/src/shell/run-query.ts`, the host's `RunQueryFn` implementation, which posts to the Hono server's `/api/notebook/query` endpoint.
- **Reused** — `apps/server/src/routes/notebook-query.ts`, a Hono route mounted at `/notebook/query` that resolves the datasource via repositories, looks up the registered node driver via `ExtensionsRegistry`, runs the query through `getDriverInstance(...).query(...)`, and returns `{ success, data: DatasourceResultSet }`.
- **Reused** — `@qlm/extensions-loader::initDatasourceRegistry()` (idempotent) and `@qlm/extensions-sdk::ExtensionsRegistry`. The notebook plugin-root calls `init` at module top so registered icons and drivers are available before the editor mounts.
- **Reused** — `@qlm/ui/qlm/datagrid::DataGrid`, the virtualised TableVirtuoso-based grid the design system exposes (and the `Design System / DataGrid` Storybook story renders). The notebook wraps it for result rendering.
- **Reused** — `@qlm/ui/tooltip` (Radix-based). The notebook wraps its subtree in `TooltipProvider` so the cell-chrome tooltips have a parent context.
- **Reused** — `@dnd-kit/sortable` for cell drag-and-drop reordering. Already a dependency from the broader UI.
- **Reused** — `@uiw/react-codemirror` + `@codemirror/lang-sql` for the SQL editor body. Already a dependency.
- **Reused** — `react-markdown` + `remark-gfm` for the markdown cell preview. Already a dependency.
- **Orthogonal** — RFC 0001 (Integrations), RFC 0003 (Environments), RFC 0005 (Contextual help panels). None of them touch notebook surfaces; the notebook will become a future consumer of the contextual help panel from RFC 0005, but that wiring is not in this phase.

## 5. Conceptual model

Three primitives:

1. **A notebook** is a project-scoped, slug-addressable document. It owns a title, a description, a list of associated datasource ids, and an ordered list of cells. Notebooks are persisted through the existing `notebook` repository port. Lifecycle: create from the list view → open the editor at the flat URL → edit cells (autosave per change) → optionally delete from the editor or list view.
2. **A cell** is one entry in a notebook's cell list. It has a stable `cellId` (number, monotonic per-notebook), a `cellType` (`'query' | 'text' | 'prompt'`), a `query` string body, an optional `title`, an `isActive` flag, a `runMode`, and a list of associated datasource ids. The cell-id is the identity inside the notebook for animation and selection bookkeeping. Cells reorder freely via drag handle or arrow buttons; any cell can be duplicated, deleted, or moved.
3. **A query result** is a transient, in-memory `DatasourceResultSet` keyed by `cellId` in plugin-root state. It is **not** persisted with the notebook — re-opening a notebook re-renders cells empty until the user re-runs them. Rationale: result sets can be large; persisting them in the notebook document blows up the row size and confuses ownership (results are an artifact of a moment in time, not part of the document).

Lifecycle of a Run:

```
user clicks Run
   │
   ▼
plugin-root.handleRunQuery(cellId, query, datasourceId)
   ├─ setCellLoadingStates(cellId → true)
   ├─ shell.query.run({ query, datasourceId, conversationId: notebook.id })
   │      │
   │      ▼
   │  host runQueryAgainstDatasource → POST /api/notebook/query
   │      │
   │      ▼
   │  Hono /notebook/query handler
   │      ├─ repos.datasource.findById(datasourceId)
   │      ├─ ExtensionsRegistry.get(datasource.datasource_provider)
   │      ├─ getDriverInstance(nodeDriver, { config: datasource.config })
   │      └─ instance.query(query.trim()) → { rows, columns, stat }
   │      │
   │      ▼
   │  { success: true, data: DatasourceResultSet }
   ├─ setCellResults(cellId → result)
   └─ setCellLoadingStates(cellId → false)
```

## 6. Architecture overview

```
apps/web/styles/global.css
   │  Tailwind v4 entry; @source must include packages/{ui,features,apps}
   │
apps/web/src/shell/run-query.ts
   │  POST /api/notebook/query
   │
apps/server/src/routes/notebook-query.ts        (existing)
   │  resolves datasource → driver → query → result
   │
packages/shell-runtime/src/resources/query.ts   (existing)
   │  exposes shell.query.run(...) wrapping the host RunQueryFn
   │
packages/apps/notebook/src/plugin-root.tsx
   ├─ initDatasourceRegistry()                  (module top, idempotent)
   ├─ default export → NotebookList view
   ├─ FlatRoot       → NotebookUI editor view
   ├─ resolveProjectContext(notebookSlug) → { projectId }
   └─ datasourceInfos useMemo:
        ExtensionsRegistry.get(provider)?.icon → NotebookDatasourceInfo.logo
   │
packages/features/notebook/src/components/
   ├─ notebook-list.tsx     — list view
   ├─ notebook-ui.tsx       — editor shell (TooltipProvider, header, cells, dialogs)
   ├─ notebook-cell.tsx     — cell chrome, footer toolbar, More menu, result tabs
   ├─ cell-divider.tsx      — baseline + affordance with hover-fan-out typed buttons
   ├─ notebook-datagrid.tsx — wrapper around DataGrid with CSV/copy handlers
   └─ notebook-cell-ai-popup.tsx — embedded AI input (advanced mode only)
   │
packages/ui/src/qlm/datagrid/datagrid.tsx   (reused as-is)
   │
packages/extensions-loader (reused) + packages/extensions-sdk (reused)
```

The strict layering: presentation packages (`features`, `ui`) never import from the host or the server. The plugin-root in `packages/apps/notebook` is the only place allowed to talk to `ExtensionsRegistry` directly, because plugin-root is the host glue layer for an app plugin.

## 7. Rollout plan

| Phase | Scope                                                                                                                                                                            | Artifacts                                                       | Status   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| 1     | List + editor + cell affordances + Table result tab + CSV export + datasource logos + unsaved indicator                                                                         | This RFC + [spec](../specs/0007-notebook-editor-phase1.md)      | Shipped  |
| 2     | Charts authoring (Graphs tab), API tab, Data App tab, Report tab content authoring, SQL autocomplete, dirty/clean state machine, run-all, output export, variables panel        | Phase 2 RFC                                                     | Future   |
| 3     | Notebook sharing, Agent integration into cells, e2e coverage                                                                                                                      | Phase 3 RFC                                                     | Future   |

Each row is an independent RFC/spec pair. Phase 1 is a complete usable surface on its own — the four placeholder tabs are explicitly labelled "coming soon" and the user can do real work without them.

## 8. Open questions

These were resolved during spec drafting and are listed here for the historical record.

1. **Persist results inside the notebook document or keep them in-memory?** Persisting would survive page reloads but inflate document size and confuse ownership (results are an artifact, not the document). **Resolution:** in-memory in plugin-root state; the user re-runs after a reload. Phase 2 may revisit if a user complains.
2. **Single tabbed panel or dual rendering with an inline summary above the tabs?** A dual rendering (a `Results · N rows × M cols` collapsible above the tabs *and* the tabbed view below) gives both at-a-glance info and the rich grid. **Resolution:** single tabbed panel — the meta info already lives in the grid header strip (`Query Results · ⏱ … rows`). Two stacks of the same data is worse than one.
3. **Fixed result panel height or auto-fit?** Fixed (e.g., 400 px) is simpler but wastes vertical space for one-row results. Auto-fit needs to know row height. **Resolution:** auto-fit `clamp(140, chrome + min(rows, 10) × 40, 480)`. The grid handles internal scroll and pagination above 10 visible rows.
4. **Wrap `@qlm/ui/qlm/datagrid` or `@qlm/ui/ai`'s minimal grid?** Two grids exist in the UI library. **Resolution:** the Storybook-grade `@qlm/ui/qlm/datagrid` — virtualised, row-numbered, header strip, CSV-ready. `@qlm/ui/ai`'s minimal grid is reserved for the chat-sidebar context where the chrome would be too heavy.
5. **Where does the unsaved indicator come from?** Without a real dirty/clean state machine. **Resolution:** plumb `updateNotebookMutation.isPending` as `hasUnsavedChanges`. Phase 2 owns the real machine.
6. **Sibling Add-cell button at the bottom or use the trailing `CellDivider` for both between-cells and bottom?** **Resolution:** the trailing `CellDivider` already covers the bottom case; one component handles both. The redesign of `CellDivider` (always-visible `+`, hover fan-out) applies uniformly.
7. **Cell-type badge on text and prompt cells too, or only query?** **Resolution:** only query cells in phase 1. Text and prompt cells render their own visible bodies and don't need the disambiguation. Revisit if user feedback says otherwise.
8. **Tailwind `@source` widening: list every package explicitly or glob `packages/features` and `packages/apps`?** **Resolution:** glob the parents. New feature/app packages should not require a stylesheet edit to be picked up.

## 9. Alternatives considered

- **Embed an existing SQL client iframe instead of building a notebook.** Rejected. Drops every project-context advantage the console gives (auth, datasource sharing, RLS), and reduces the surface to a single-statement pad.
- **Single-statement query pad without cells.** Rejected. Notebooks are a strict superset and the cell primitive is the foundation for charts, prompts, and data apps in later phases. Building the pad first and migrating to cells later is wasted work.
- **Persist results in the notebook document.** Rejected — see §8.1.
- **One result viewer with no tabs at all.** Rejected. Even though only Table is functional in phase 1, the tab strip telegraphs that more views are coming and reserves visual real estate so phase 2 doesn't reshuffle the layout.
- **A custom in-house data grid instead of wrapping the existing one.** Rejected. The design system already exposes a virtualised grid with the exact features the notebook needs. Wrapping it preserves visual consistency across the app and CSV export logic stays in one place.
- **Render brand logos via a separate `@qlm/extensions-icons` package.** Rejected. The icons are already addressable as static URLs from `ExtensionsRegistry.get(...).icon`. A separate package would be redirection without value.

## 10. References

- `.claude/rules/hexagonal-architecture.md` — layering rules. The notebook respects them: presentation never reaches into adapters; the plugin-root is the only allowed consumer of `ExtensionsRegistry`.
- `.claude/rules/i18n.md` — every new user-facing string this RFC adds is wrapped in `t()` against the `notebooks` namespace.
- `.claude/rules/clean-code.md` — followed for the cell-state hygiene (no dead state variables, no orphaned helpers).
- `apps/server/src/routes/notebook-query.ts` — the existing run endpoint the notebook reuses unchanged.
- `packages/ui/src/qlm/datagrid/datagrid.tsx` + `datagrid.stories.tsx` — the canonical DataGrid the notebook wraps.
- `packages/extensions-loader/src/index.browser.ts` — `initDatasourceRegistry()` and friends.

---

## Review checklist for the author

- [x] Does §1 make the scope obvious in one paragraph?
- [x] Is every §3.1 goal an observable exit criterion?
- [x] Is every §3.2 non-goal pinned to a named future phase?
- [x] Does §4 distinguish reused prior art from orthogonal prior art?
- [x] Would a newcomer understand the feature from §1 + §5 alone?
- [x] Are the open questions real design decisions, resolved in §1 of the spec?
- [x] Does the rollout plan match realistic engineering capacity?
- [x] Does every alternative in §9 have a concrete reason it was not chosen?
