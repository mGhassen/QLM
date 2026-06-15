---
spec: docs/specs/0007-notebook-editor-phase1.md
spec_sections:
  - "#32-screen-by-screen"
  - "#41-layered-sequence-diagrams"
  - "#75-presentation--feature-package-packagesfeaturesnotebook"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks:
  - 005-wire-datagrid-with-csv-export
blocked_by:
  - 001-wire-tailwind-source-scope
  - 002-wire-notebook-plugin-and-run-path
---

# Build tabbed result panel

## Goal

Render exactly one result panel per query cell — a tabbed switcher (`Table | Graphs | API | Data App | Report`) where only the Table tab is functional in phase 1 — and auto-fit the panel height to the content (`clamp(140, chrome + min(rows, 10) × 40, 480)`) so a one-row result doesn't waste a screen of vertical space.

## Scope

**In scope**
- A single tabbed result panel inside `packages/features/notebook/src/components/notebook-cell.tsx`, rendered only when `result` is set on the cell.
- Tabs: `Table`, `Graphs`, `API`, `Data App`, `Report`. Only `Table` renders content (`<NotebookDataGrid result={result} />`); the other four render "coming soon" placeholders.
- An IIFE around the panel `<div>` that computes `panelHeight`:
  ```ts
  const ROW_PX = 40;
  const CHROME_PX = 96;
  const MIN_PANEL_PX = 140;
  const MAX_PANEL_PX = 480;
  const visibleRows = Math.min(result.rows?.length ?? 0, 10);
  const fittedTableHeight = clamp(MIN_PANEL_PX, CHROME_PX + visibleRows * ROW_PX, MAX_PANEL_PX);
  const panelHeight = resultView === 'table' ? fittedTableHeight : 400;
  ```
- A single `<Collapsible>` "Execution error" panel rendered when `error` is set; the cell shows it once and only once.

**Out of scope**
- Real Graphs / API / Data App / Report content → phase 2.
- DataGrid wrapper internals (CSV export, copy page, header strip) → story 005.
- Result persistence → resolved question §1.1: in-memory only, by design.

## Acceptance criteria

- [x] After a successful Run, the cell renders **exactly one** tabbed result panel — no duplicate "Results" Collapsible above the footer.
- [x] After a failed Run, the cell renders **exactly one** Collapsible "Execution error" panel — no trailing duplicate Alert.
- [x] The Table tab is selected by default.
- [x] The four placeholder tabs render a single muted "coming soon" line each.
- [x] A 1-row result fits in ≤ 160 px of vertical space.
- [x] A 100-row result clamps at 480 px and the inner grid is scrollable.
- [x] No orphaned cell-state variables left behind (e.g. `resultsOpen` / `setResultsOpen` / the `formatQueryDuration` helper).
- [x] `pnpm --filter @qlm/notebook typecheck` is clean.

## Tasks

Shipped files:

- `packages/features/notebook/src/components/notebook-cell.tsx` — single tabbed result panel; auto-fit IIFE; orphan-state cleanup.

## Demo / verification

```bash
pnpm web:dev
```

1. Run `select * from sheet limit 1;` against a datasource. Confirm exactly one panel and a tight ~140-160 px panel height.
2. Run `select * from sheet limit 100;` (or any 100-row query). Confirm the panel caps at 480 px and the inner grid scrolls.
3. Run `select * from nonexistent;`. Confirm exactly one Collapsible "Execution error" panel.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
