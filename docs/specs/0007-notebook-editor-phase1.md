# Spec — Notebook editor (phase 1)

| Field        | Value                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| Status       | Shipped 2026-04-11                                                                   |
| Author       | Hani Chalouati                                                                       |
| Created      | 2026-04-11                                                                           |
| Implements   | [RFC 0007 — Notebook editor](../rfcs/0007-notebook-editor.md)                        |
| Target phase | Phase 1                                                                              |

This document is the implementation spec for RFC 0007. The RFC establishes the *why* and *shape*; this spec defines the *what* and *how*: resolved open questions, exact data shapes, API contracts, functional flows, file-by-file work items, and a verification plan.

Scope is strict to phase 1. Everything in §3.2 of the RFC is deferred and does not appear here.

---

## 1. Resolved open questions

| # | Question                                                                                  | Resolution for phase 1                                                                                                                                                       |
| - | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | Persist results inside the notebook document or keep them in-memory?                      | In-memory in plugin-root state (`Map<cellId, DatasourceResultSet>`). Re-opening a notebook re-renders cells empty; the user re-runs.                                          |
| 2 | Single tabbed result panel or dual rendering (inline summary + tabs)?                     | Single tabbed panel. The grid header strip already shows `Query Results · ⏱ … rows`; a second copy is redundant.                                                              |
| 3 | Fixed result panel height or auto-fit?                                                    | Auto-fit `clamp(140, chrome + min(rows, 10) × 40, 480)` for the Table tab; fixed 400 for the placeholder tabs whose content size is unknown.                                  |
| 4 | Wrap `@guepard/ui/guepard/datagrid` or `@guepard/ui/ai`'s minimal grid?                   | Wrap `@guepard/ui/guepard/datagrid` — the virtualised, row-numbered, header-stripped grid the design system already showcases.                                                |
| 5 | Where does the unsaved indicator come from without a real dirty/clean state machine?     | Pass `updateNotebookMutation.isPending` as `hasUnsavedChanges` on `NotebookUI`. It is "save in flight" rather than "dirty since last save"; phase 2 owns the real machine.    |
| 6 | Sibling Add-cell button at the bottom or trailing `CellDivider` for both?                 | Trailing `CellDivider`. One redesign of the divider component covers both the between-cells case and the bottom case.                                                        |
| 7 | Cell-type badge on text and prompt cells too?                                             | Only on query cells in phase 1. Text and prompt cells render visible bodies that disambiguate themselves.                                                                     |
| 8 | Tailwind `@source` widening: list every package or glob the parents?                      | Glob the parents (`packages/features`, `packages/apps`). New feature/app packages must not require a stylesheet edit to be picked up by the JIT scanner.                      |

## 2. User stories

This phase delivers seven user-visible capabilities.

- As a user, I can list and create notebooks under my project from `/prj/{projectSlug}/notebook` and open a notebook editor at `/notebook/{notebookSlug}`.
- As a user, I can run a SQL cell against any of my project's datasources and see the rows render inline in the cell's result panel.
- As a user, I can scan the result of any size — a one-row result fits, a hundred-row result is internally scrollable — without the panel wasting screen space.
- As a user, I can export the full result set to CSV from the grid header strip and copy it to the clipboard.
- As a user, I can author a notebook with mixed cell types (SQL, Markdown, Prompt), reorder them by drag, duplicate them from the More menu, and insert new typed cells from any divider.
- As a user, I can pick a datasource from the in-cell selector and see the brand logo (postgres, mongo, s3, …) instead of two-letter initials.
- As a user, I get tooltips on every footer icon and on the Run button when it's disabled, so I learn the surface without trial-and-error.

## 3. Functional flow

### 3.1 Information architecture

The notebook lives as a flat-route plugin under `packages/apps/notebook`. Two URLs:

- `/prj/{projectSlug}/notebook` — list view, rendered by the plugin's `default` export.
- `/notebook/{notebookSlug}` — editor view, rendered by the plugin's `FlatRoot` export. The shell resolves the project context from the slug via the plugin's `resolveProjectContext` sibling export.

The notebook list lives in the project sidebar's "Workspace" group alongside Datasources. There is no separate sidebar bucket; the notebook is one of several workspace-scoped primitives.

### 3.2 Screen-by-screen

**Notebook list (`/prj/{projectSlug}/notebook`)**

- A grid (or list, toggleable) of notebook cards. Each card shows the title, created date, creator avatar, and a delete trigger on hover.
- "New notebook" button creates an `Untitled Notebook` and navigates to its editor.
- Empty state: "No notebooks have been created yet" + the same "New notebook" button.
- Search input filters by title.

**Notebook editor (`/notebook/{notebookSlug}`)**

- **Header** (one row): the notebook title (inline-editable via a hover-revealed pencil at 60% opacity), an optional yellow `Unsaved changes` dot when `hasUnsavedChanges`, a delete trigger on hover, and a right-side action slot reserved for future affordances.
- **Cells container** (`pl-16 pr-12 mt-6` so the cell drag handles have a left gutter and the cards are inset from the viewport edge):
  - A vertical stack of `<NotebookCell>` interleaved with `<CellDivider>` between adjacent cells, ending with a tail `<CellDivider>`.
  - Drag-and-drop reordering via `@dnd-kit/sortable`.
- **Cell** (the most complex screen surface):
  - **Header row** (query cells only): "Cell N" + an `SQL` language pill + the editable title pencil + a Run button on the right.
    - The Run button is wrapped in a `Tooltip` whose content switches: "Select a datasource to run" when disabled, "Run cell (⌘↵)" when enabled.
    - Disabled when `!query.trim() || isLoading || !selectedDatasource`.
  - **Body**:
    - Query cells: a CodeMirror SQL editor with `oneDark` theme in dark mode and basic SQL grammar.
    - Markdown cells: a `react-markdown` preview-by-default surface that toggles to a textarea on double-click.
    - Prompt cells: a textarea reserved for the agent surface.
  - **Footer toolbar** (a horizontal strip pinned at the bottom of the cell):
    - Left group (icon buttons, each in a `Tooltip`): AI Sparkles (advanced mode only), Format, Copy, Delete, More.
    - Right group: a paginated, searchable `DatasourceSelectWithPagination` showing the brand logo of each provider.
  - **More dropdown menu**:
    - Add cell title (only when `cell.title` is empty)
    - **Duplicate cell** (calls `handleDuplicateCell` from the parent)
    - Move up
    - Move down
    - Full view
  - **Result panel** (rendered when `result` is set, between the body and the footer):
    - A tab bar with `Table | Graphs | API | Data App | Report`.
    - The Table tab renders a `<NotebookDataGrid result={result} />`. The other tabs render "coming soon" placeholders.
    - Panel height: `clamp(140, chrome + min(rows, 10) × 40, 480)` for `Table`; fixed `400` for the others.
  - **Error panel** (rendered when `error` is set, between the body and the footer):
    - A single `<Collapsible>` with header "Execution error" + the error string in a `<pre>`.

**Cell divider (`<CellDivider>`)**

- At rest: a thin gradient line with a small muted `+` circle centered on it (60% opacity, always visible).
- On hover: the `+` circle fades and scales to zero. Three rounded buttons (Code / Markdown / Prompt) fan in in its place. Click adds a cell of the chosen type at the divider's position.

**Full View dialog**

- A `<Dialog>` triggered by the More menu's "Full view". Renders a larger CodeMirror editor + the result grid for the selected cell. Useful for queries with long output.

### 3.3 User flows (happy paths)

**Create and run a query**

1. User navigates to `/prj/my-project/notebook`.
2. User clicks **New notebook**. The list view's mutation creates the notebook and navigates to `/notebook/{newSlug}`.
3. The editor mounts. The notebook starts with no cells. The trailing `<CellDivider>` is visible at the top of the cells container.
4. User hovers the divider. Three typed buttons fan in. User clicks **Code**.
5. A new query cell appears. The SQL editor focuses. User types `select * from sheet;`.
6. User picks a datasource from the in-cell selector. The Run button becomes enabled and its tooltip switches to "Run cell (⌘↵)".
7. User clicks Run (or presses ⌘↵). The cell shows a loading spinner.
8. The query round-trips through `shell.query.run({ query, datasourceId, conversationId: notebook.id })` → host `runQueryAgainstDatasource` → POST `/api/notebook/query` → Hono handler → driver → `{ rows, columns, stat }`.
9. The result is stored at `cellResults[cellId]` in plugin-root state.
10. The cell rerenders. The result panel mounts with the auto-fit height. The Table tab is selected. The grid renders with row numbers and the `Query Results · ⏱ … rows` header strip.

**Export results to CSV**

1. With a result rendered, user clicks the Download icon in the grid header strip.
2. The `NotebookDataGrid` wrapper's `handleDownloadCsv` serialises every row of the result set via `rowsToCsv` (CSV escaping for commas/quotes/newlines, JSON-stringify for object cells).
3. A Blob is created and an anchor is clicked to trigger a `query-result.csv` download.

**Duplicate a cell**

1. User opens the cell's More menu.
2. User clicks **Duplicate cell**.
3. The parent's `handleDuplicateCell(cellId)` runs, inserts a copy directly below the source cell, animates the insertion, and persists the new cell list via `updateNotebookMutation`.

**Insert a typed cell from the divider**

1. User hovers the `<CellDivider>` between two cells (or the trailing one).
2. The baseline `+` fades; the typed buttons fan in.
3. User clicks **Markdown**. `handleAddCell(prevCellId, 'text')` runs. A new markdown cell appears in place.

### 3.4 Error and edge-case behaviour

| Trigger                                              | Behaviour                                                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Server returns 4xx/5xx for the run                   | `handleRunQuery` catches the error and stores it in `cellErrors[cellId]`. The cell renders the single Collapsible "Execution error" panel with the error string.                          |
| Run clicked with no datasource                       | Button is disabled. Wrapping `Tooltip` shows "Select a datasource to run" so the user understands the requirement.                                                                          |
| Run clicked with empty query body                    | Button is disabled. Tooltip stays on "Run cell (⌘↵)" since the precondition is the body, not the datasource. The user reads the empty editor and understands.                              |
| Result is empty (`rows.length === 0`)                | The grid renders its own "No data to display" empty state. The auto-fit height clamps to the `MIN_PANEL_PX` floor (140).                                                                    |
| Datasource provider is not registered in `ExtensionsRegistry` | `extension?.icon` is undefined; `ds.logo` is undefined; the renderer falls through to two-letter initials. No crash.                                                                |
| User navigates away mid-run                          | The plugin-root unmounts. In-flight mutations resolve into orphaned state, but no UI is left to render them. Acceptable in phase 1; phase 2 may add abort signals.                          |
| User reloads the editor                              | Cell state in plugin-root is reset (in-memory, not persisted). The user re-runs cells they want results for. Title, body, and cell list are persisted on the notebook document.             |
| `initDatasourceRegistry()` not yet called when the editor mounts | Impossible. The notebook plugin-root calls `initDatasourceRegistry()` at module top before any component renders. The function is idempotent so the datasources plugin can also call it. |

## 4. Technical flow

### 4.1 Layered sequence diagrams

**Run a SQL cell**

```
NotebookCell (Run click)
   │
   ▼
plugin-root.handleRunQuery(cellId, query, datasourceId)
   │  ├─ setCellLoadingStates(cellId → true)
   │  └─ shell.query.run({ query, datasourceId, conversationId: notebook.id })
   │
   ▼
@guepard/shell-runtime  resources/query.ts  →  host RunQueryFn
   │
   ▼
apps/web/src/shell/run-query.ts: apiPost('/notebook/query', body)
   │
   ▼
apps/server/src/server.ts  api.route('/notebook/query', createNotebookQueryRoutes(...))
   │
   ▼
apps/server/src/routes/notebook-query.ts (POST /)
   ├─ repos.datasource.findById(datasourceId)
   ├─ ExtensionsRegistry.get(datasource.datasource_provider)
   ├─ getDriverInstance(nodeDriver, { config: datasource.config })
   └─ instance.query(trimmedQuery)
   │
   ▼
{ success: true, data: DatasourceResultSet }
   │
   ▼
plugin-root sets cellResults[cellId] → cell rerenders → result tabs → NotebookDataGrid → DataGrid
```

**Datasource logo lookup**

```
plugin-root datasourceInfos useMemo
   │
   ▼
for each ds in datasourcesQuery.data:
   ExtensionsRegistry.get<DatasourceExtension>(ds.datasource_provider)?.icon
   │
   ▼
NotebookDatasourceInfo { id, name, provider, logo }[]
   │
   ▼
NotebookCell renderDatasourceOption(ds): ds.logo ? <img/> : <initials/>
```

**Auto-fit result panel height**

```
visibleRows = min(result.rows.length, 10)
fittedTableHeight = clamp(MIN_PANEL_PX=140, CHROME_PX=96 + visibleRows*ROW_PX=40, MAX_PANEL_PX=480)
panelHeight = resultView === 'table' ? fittedTableHeight : 400
<div style={{ height: panelHeight }}>
```

### 4.2 Component split

| Layer                 | Package                                  | Responsibility                                                                                  |
| --------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Domain                | `@guepard/domain`                        | `Notebook` entity (existing), `DatasourceResultSet` entity (existing)                            |
| Adapters              | `packages/repositories/*`                | `notebook` and `datasource` repository ports (existing)                                          |
| Server                | `apps/server`                            | `/notebook/query` Hono route (existing)                                                          |
| Shell runtime         | `@guepard/shell-runtime`                 | `useShell()` + `query` resource + `notebooks` resource (existing)                                |
| Presentation          | `@guepard/notebook` (= `packages/features/notebook`) | `NotebookList`, `NotebookUI`, `NotebookCell`, `CellDivider`, `NotebookDataGrid` |
| Plugin glue           | `@guepard/app-notebook` (= `packages/apps/notebook`) | sibling exports (`default`, `FlatRoot`, `resolveProjectContext`); registry init; logo lookup |
| Host                  | `apps/web`                               | Tailwind `@source` scope; `runQueryAgainstDatasource` host adapter; locale JSON                  |

The plugin glue is the only place allowed to import from `@guepard/extensions-sdk` / `@guepard/extensions-loader`. The presentation layer never sees the registry.

## 5. API contracts

### 5.1 Data shapes

```ts
// Already in @guepard/domain/entities — listed here for completeness.

type ColumnHeader = {
  name: string;
  displayName: string;
  originalType: string | null;
  type?: string;
  // …optional metadata
};

type DatasourceRow = Record<string, unknown>;

type DatasourceResultStat = {
  rowsAffected: number;
  rowsRead: number | null;
  rowsWritten: number | null;
  queryDurationMs: number | null;
};

type DatasourceResultSet = {
  columns: ColumnHeader[];
  rows: DatasourceRow[];
  stat?: DatasourceResultStat;
};

// New in this phase — feature-package presentation type.

interface NotebookDatasourceInfo {
  id: string;
  name: string;
  provider?: string;
  logo?: string; // resolved from ExtensionsRegistry.get(provider)?.icon
}

interface NotebookCellData {
  query?: string;
  cellId: number;            // monotonic per-notebook
  cellType: 'query' | 'text' | 'prompt';
  datasources: string[];     // length 0 or 1 in phase 1
  isActive: boolean;
  runMode: 'default' | 'fixit';
  title?: string;
}
```

### 5.2 Endpoints

| Method | Path                  | Auth     | Request body                                                | Response body                                  | Status codes               |
| ------ | --------------------- | -------- | ----------------------------------------------------------- | ---------------------------------------------- | -------------------------- |
| POST   | `/api/notebook/query` | Required | `{ conversationId: string, query: string, datasourceId: string }` | `{ success: true, data: DatasourceResultSet }` | 200, 400 (validation), 404 (datasource missing), 500 |

The endpoint is mounted in the server at `apps/server/src/server.ts:137` via `api.route('/notebook/query', createNotebookQueryRoutes(getRepos))`. The host client must POST to the **exact same path** or the router will reply 404.

### 5.3 Rate limiting, pagination, caching

- **Rate limiting**: none specific to the notebook in phase 1. The server's existing per-user limits apply.
- **Pagination**: handled inside the grid via `pageSize=50` (default). Clients see the full result set; the grid pages it for display.
- **Caching**: none. Each Run hits the server. The result is held in memory until the cell is unmounted or the user re-runs.

## 6. Data model

### 6.1 Schema

No schema changes. The existing `notebooks` table and `cells` JSONB column are sufficient.

### 6.2 Config / payload contracts

The `cells` JSONB column holds an array of `NotebookCellData` (see §5.1). No shape change in this phase.

### 6.3 Secrets contract

No secrets are stored on the notebook side. Datasource credentials live on the `datasources` table and are read server-side by the `/notebook/query` handler; they never reach the browser through the notebook surface.

## 7. File-by-file work items

### 7.1 Domain (`packages/domain`)

None. Reuses existing `Notebook`, `DatasourceResultSet`, `ColumnHeader` entities.

### 7.2 Adapters (`packages/repositories/*` and `apps/web/src/lib/repositories`)

None. Reuses the existing `notebook` and `datasource` repositories.

### 7.3 Shell runtime (`packages/shell-runtime`)

None. Reuses the existing `query` resource and `notebooks` resource.

### 7.4 Server (`apps/server`)

None. Reuses the existing `/notebook/query` Hono route at `apps/server/src/routes/notebook-query.ts`.

### 7.5 Presentation — feature package (`packages/features/notebook`)

- **`src/components/notebook-ui.tsx`** — editor shell. Wraps the entire return tree in `<TooltipProvider delayDuration={200}>` so cell-chrome tooltips have a parent context. Renders the title (with hover-revealed pencil + delete + optional unsaved-yellow-dot when `hasUnsavedChanges`), the cells container (`mt-6 pl-16 pr-12`), the dnd `SortableContext`, the trailing `CellDivider`, and the `FullViewDialog`. Receives `cellResults`, `cellErrors`, `cellLoadingStates`, `onRunQuery`, and friends from the plugin-root.
- **`src/components/notebook-cell.tsx`** — single cell with header, body, footer, result panel, and error panel.
  - Header (query cells only): drag handle on the left, "Cell N" + `SQL` language badge + hover-revealed title pencil + Run button on the right wrapped in a Tooltip.
  - Body: CodeMirror SQL editor (`@codemirror/lang-sql`, `oneDark` theme in dark mode); markdown preview/edit toggle for text cells; textarea for prompt cells.
  - Footer toolbar: tooltipped icon buttons (AI / Format / Copy / Delete / More), `DatasourceSelectWithPagination` with logo-aware option rendering on the right.
  - More menu: Add cell title, **Duplicate cell** (wired to the parent's `onDuplicate`), Move up, Move down, Full view.
  - Result panel: single tabbed switcher (`Table | Graphs | API | Data App | Report`); only Table is functional and renders `<NotebookDataGrid result={result} />`. Panel height computed per render via `clamp(140, 96 + min(rows, 10)*40, 480)` for the Table tab.
  - Error panel: single Collapsible "Execution error" with the error string in a `<pre>`.
- **`src/components/cell-divider.tsx`** — divider between cells.
  - At rest: a thin gradient line with a muted `+` circle (60% opacity).
  - On hover: the circle fades; three rounded typed buttons (Code / Markdown / Prompt) fan in. Each button calls `onAddCell('query' | 'text' | 'prompt')`.
- **`src/components/notebook-datagrid.tsx`** — wrapper around `DataGrid` from `@guepard/ui/guepard/datagrid`.
  - Forwards `columns`, `rows`, `stat`, `pageSize`, `showRowNumbers`.
  - Provides a wrapper-level `handleDownloadCsv` that serialises the **full** result set via `rowsToCsv` (escaping commas/quotes/newlines, `JSON.stringify`'ing object/array cells) and triggers a Blob download named `${exportFileName}.csv`.
  - Provides a wrapper-level `handleCopyPage` that copies the same CSV to the clipboard.
  - Wires both to `onDownloadCSV` / `onCopyPage` so the grid's header strip renders the action icons.
- **`src/components/notebook-list.tsx`** — list view (existing pattern from other plugins).
- **`src/components/notebook-cell-ai-popup.tsx`** — embedded AI input shown when the user opens the AI popup from the cell footer (advanced mode only).
- **`src/components/notebook-datagrid.tsx`** — see above.
- **`src/components/notebook-markdown-components.tsx`** — `react-markdown` component overrides for the markdown cell preview.

### 7.6 Shell app (`packages/apps/notebook`)

- **`package.json`** — declare workspace deps on `@guepard/extensions-loader` and `@guepard/extensions-sdk`. (`@guepard/notebook`, `@guepard/shell-runtime`, `@guepard/domain`, `@guepard/ui` are already declared.)
- **`src/plugin-root.tsx`** —
  - Call `initDatasourceRegistry()` at module top (idempotent) so registered icons and drivers are available before the editor mounts.
  - Default export: `NotebookPluginRoot` — the list view. Uses `useShell()` for `notebooks.list / create / delete` and navigates to the editor via `/notebook/{slug}`.
  - `FlatRoot` export — the editor view. Uses `useShell()` for `notebooks.getBySlug / update`, `datasources.list`, and `query.run`. Builds the `datasourceInfos` array by enriching each datasource with `ExtensionsRegistry.get(provider)?.icon` as `logo`. Manages local cell-execution state (`cellResults`, `cellErrors`, `cellLoadingStates`). Passes everything to `<NotebookUI>`, including `hasUnsavedChanges={updateNotebookMutation.isPending}`.
  - `resolveProjectContext` export — given a `notebookSlug` URL param, returns `{ projectId }` by hitting the notebook repository.

### 7.7 i18n (`apps/web/src/lib/i18n/locales/en/notebooks.json`)

See §11 for the full key map.

### 7.8 Host (`apps/web`)

- **`apps/web/styles/global.css`** — Tailwind v4 entry. The `@source` directive list must include every package whose `.tsx` files use utility classes:
  ```css
  @source "../../../packages/ui/src";
  @source "../../../packages/features";
  @source "../../../packages/apps";
  @source "./";
  ```
  Globbing the parent dirs is the policy: new feature/app packages should not need a stylesheet edit to be picked up by the JIT scanner.
- **`apps/web/src/shell/run-query.ts`** — host adapter for `RunQueryFn`. Posts to `/notebook/query` (matching the server mount). Returns `response.data` as a `DatasourceResultSet`.

## 8. Permissions and RLS

No new permissions or RLS policies. The notebook reuses the existing `notebooks` resource scope: a member of the project can list, create, update, and delete notebooks within that project. The `/notebook/query` endpoint inherits the existing datasource permission checks at the repository layer.

## 9. Security checklist

- [x] No new secrets introduced.
- [x] No new endpoints; the existing `/notebook/query` endpoint stays auth-required.
- [x] CSV download runs entirely client-side from the in-memory result set; no server round-trip; no data exposure beyond what the user already sees in the grid.
- [x] Tailwind `@source` widening only affects build-time class generation; no runtime privilege change.
- [x] `ExtensionsRegistry.get(...)` is read-only; the plugin-root cannot mutate the registry.
- [x] Notebook cell bodies are stored as plain text in the `cells` JSONB column. No HTML rendering of user input outside `react-markdown`'s sanitised pipeline.

## 10. Verification plan

### 10.1 Static checks

```bash
pnpm --filter @guepard/notebook typecheck
pnpm --filter @guepard/app-notebook exec tsc --noEmit
pnpm --filter web typecheck
pnpm lint --filter @guepard/notebook
```

### 10.2 Unit tests

None in this phase. The slice is presentation-only and the cell behaviour is exercised by the manual smoke and (in phase 2) by Playwright e2e.

### 10.3 Integration tests

None.

### 10.4 End-to-end (Playwright)

None in this phase. Notebook e2e is RFC 0007 phase 2.

### 10.5 Manual smoke

```bash
pnpm web:dev
```

Then in the browser:

1. Sign in. Open a project. Click **Notebooks** in the workspace sidebar group.
2. Confirm the list view renders. Click **New notebook**. The browser navigates to `/notebook/{newSlug}`.
3. Confirm the editor has a left/right gutter, the trailing `<CellDivider>` is visible at the top, and the title shows "Untitled Notebook" with a subtle pencil at 60% opacity.
4. Hover the divider. Confirm three typed buttons fan in. Click **Code**. A query cell mounts; CodeMirror focuses.
5. Type `select * from sheet;` (or any valid query for one of your datasources).
6. Open the in-cell datasource selector. Confirm each option shows the brand SVG (postgres elephant, mongo leaf, s3 bucket, …). Pick one.
7. Hover the Run button. Tooltip says "Run cell (⌘↵)". Click Run (or press ⌘↵).
8. Confirm the result panel mounts with exactly **one** tabbed switcher and **one** grid. The grid shows row numbers, the `Query Results · ⏱ … rows` header strip, and Export CSV / Copy page buttons.
9. Confirm the panel height auto-fits: a 1-row result is ≤ 160 px tall; a 100-row result caps at 480 px and the grid scrolls internally.
10. Click **Export CSV**. Confirm the browser downloads `query-result.csv` containing every row, not just the visible page.
11. Hover each footer icon. Confirm each shows a tooltip.
12. Clear the datasource selection. Hover Run. Tooltip switches to "Select a datasource to run".
13. Open the More menu. Click **Duplicate cell**. A copy appears below the source cell with the duplicate animation.
14. Try a query that fails (`select * from nonexistent;`). Confirm exactly **one** Collapsible "Execution error" panel appears, containing the error message in a `<pre>`.
15. Edit the title. Confirm a yellow dot appears next to it while the save mutation is in flight, then disappears.

## 11. i18n key map

All under namespace `notebooks` in `apps/web/src/lib/i18n/locales/en/notebooks.json`.

| Group              | Keys                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top level          | `unsaved`, `editTitle`                                                                                                                                                          |
| `cell.type.*`      | `cell.type.sql`, `cell.type.markdown`, `cell.type.prompt`                                                                                                                       |
| `cell.actions.*`   | `cell.actions.run`, `cell.actions.runPickDatasource`, `cell.actions.toggleAi`, `cell.actions.format`, `cell.actions.copy`, `cell.actions.copied`, `cell.actions.delete`, `cell.actions.more`, `cell.actions.duplicate`, `cell.actions.moveUp`, `cell.actions.moveDown`, `cell.actions.fullView`, `cell.actions.addTitle` |
| `divider.*`        | `divider.add`, `divider.addCode`, `divider.addMarkdown`, `divider.addPrompt`                                                                                                    |

## 12. Implementation sequencing

Stage A — Build pipeline
- 001 — `wire-tailwind-source-scope`

Stage B — Plugin scaffolding and host wiring
- 002 — `wire-notebook-plugin-and-run-path`

Stage C — Cell chrome and presentation
- 003 — `build-cell-chrome-and-divider`

Stage D — Result rendering
- 004 — `build-tabbed-result-panel`
- 005 — `wire-datagrid-with-csv-export`

Stage E — Selector polish and host integration
- 006 — `wire-datasource-provider-logos`
- 007 — `wire-notebook-header-and-tooltip-provider`

Stories within a stage are independent within that stage; they share the stage's gates but do not block each other. Stage A is the only stage that must complete before any of the others is observable in the dev server.

## 13. Follow-ups (deferred, not in this phase)

- Real Graphs / API / Data App / Report tab implementations.
- SQL autocomplete and schema-aware completion in CodeMirror.
- A real dirty/clean state machine so `hasUnsavedChanges` reflects actual unsaved edits, not "save in flight".
- Run-all-cells orchestration.
- JSON / Parquet / Markdown export options in the grid header strip.
- Variables panel and cross-cell references.
- A real SQL formatter for `handleFormatCell`.
- Notebook e2e Playwright coverage under `apps/e2e/tests/notebook/`.
- Per-locale notebook content.
- Migration of pre-existing hardcoded strings inside `notebook-cell.tsx` to i18n.
- A more descriptive `exportFileName` for the CSV download (notebook title slug or similar).
- Optional "results meta" strip above the tabs (rows × cols × duration) if a user asks for it.

---

## Changelog

None.
