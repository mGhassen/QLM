---
spec: docs/specs/0007-notebook-editor-phase1.md
spec_sections:
  - "#75-presentation--feature-package-packagesfeaturesnotebook"
  - "#32-screen-by-screen"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks: []
blocked_by:
  - 001-wire-tailwind-source-scope
  - 004-build-tabbed-result-panel
---

# Wire DataGrid with CSV export

## Goal

Render the Table tab through a thin `NotebookDataGrid` wrapper around the canonical virtualised `DataGrid` from `@guepard/ui/guepard/datagrid`, and add wrapper-level CSV export and clipboard-copy handlers so the grid header strip's action icons are functional and operate on the **full** result set, not just the visible page.

## Scope

**In scope**
- `packages/features/notebook/src/components/notebook-datagrid.tsx`
  - Import `DataGrid` from `@guepard/ui/guepard/datagrid` and pass through `columns`, `rows`, `stat`, `pageSize`, `showRowNumbers`.
  - Implement `rowsToCsv(columns, rows)` with CSV escaping for commas/quotes/newlines and `JSON.stringify` for object/array cells.
  - Implement `handleDownloadCsv` that builds a Blob and triggers a `${exportFileName}.csv` download via an anchor click.
  - Implement `handleCopyPage` that writes the same CSV string to the clipboard.
  - Pass `onDownloadCSV` + `onCopyPage` to the grid so the header strip's action row renders.
  - Accept an optional `exportFileName?: string` prop (defaults to `'query-result'`) so the notebook can pass a more descriptive filename later.
- The Table tab in `notebook-cell.tsx` renders `<NotebookDataGrid result={result} />` (already done in story 004's IIFE; this story is the wrapper rewrite).

**Out of scope**
- JSON / Parquet / Markdown export → phase 2.
- A descriptive filename derived from notebook/cell title → phase 2 (default `query-result.csv` is fine for now).

## Acceptance criteria

- [x] The Table tab renders the virtualised grid with row numbers and the `Query Results · ⏱ … rows` header strip.
- [x] Clicking the Download icon downloads `query-result.csv` containing **every** row of the result set, with correct CSV escaping for commas, quotes, newlines, and `JSON.stringify`-rendered object/array cells.
- [x] Clicking the Copy icon writes the same CSV to the clipboard.
- [x] `pnpm --filter @guepard/notebook typecheck` is clean.

## Tasks

Shipped files:

- `packages/features/notebook/src/components/notebook-datagrid.tsx` — wrapper rewrite, CSV serializer, download/copy handlers.

## Demo / verification

```bash
pnpm web:dev
```

1. Run a query that returns multiple pages of rows.
2. Confirm the grid header strip shows `Query Results · ⏱ … rows` and the Download / Copy icons.
3. Click Download. Open `~/Downloads/query-result.csv`. Confirm the file contains every row, not just the visible page.
4. Click Copy. Paste into a text editor. Confirm the same CSV.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
