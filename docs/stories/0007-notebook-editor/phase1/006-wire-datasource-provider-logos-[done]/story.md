---
spec: docs/specs/0007-notebook-editor-phase1.md
spec_sections:
  - "#76-shell-app-packagesappsnotebook"
  - "#41-layered-sequence-diagrams"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks: []
blocked_by:
  - 001-wire-tailwind-source-scope
  - 002-wire-notebook-plugin-and-run-path
---

# Wire datasource provider logos

## Goal

Render the in-cell datasource selector with each provider's brand logo (postgres, mongo, s3, …) by resolving icons from `ExtensionsRegistry`, falling back to two-letter initials only when the provider is not registered.

## Scope

**In scope**
- `packages/apps/notebook/package.json` — declare workspace deps on `@guepard/extensions-loader` and `@guepard/extensions-sdk`.
- `packages/apps/notebook/src/plugin-root.tsx`
  - Call `initDatasourceRegistry()` at module top (idempotent) so the registry is populated regardless of which app the user opened first.
  - In the `datasourceInfos` `useMemo` inside `FlatRoot`, look up `ExtensionsRegistry.get<DatasourceExtension>(ds.datasource_provider)?.icon` and pass it as `logo` on each `NotebookDatasourceInfo`.
- The `renderDatasourceOption` helper in `notebook-cell.tsx` already branches on `ds.logo` to render an `<img>` or initials — this story supplies the data, no renderer change.

**Out of scope**
- A separate `@guepard/extensions-icons` package → rejected in RFC §9 (icons are already addressable as URLs).
- Schema lookup for per-provider validation → not needed for the notebook in phase 1.

## Acceptance criteria

- [x] Opening the in-cell datasource selector shows each option with the provider's SVG logo to the left of its name.
- [x] The currently-selected datasource in the selector trigger also shows its logo (via Radix Select projecting the SelectItem children into SelectValue).
- [x] A datasource whose provider is missing from `ExtensionsRegistry` falls through to two-letter initials without crashing.
- [x] `pnpm --filter @guepard/app-notebook exec tsc --noEmit` is clean.

## Tasks

Shipped files:

- `packages/apps/notebook/package.json` — new deps `@guepard/extensions-loader`, `@guepard/extensions-sdk`.
- `packages/apps/notebook/src/plugin-root.tsx` — module-top `initDatasourceRegistry()`, `ExtensionsRegistry.get(...).icon` lookup in `datasourceInfos`.

## Demo / verification

```bash
pnpm web:dev
```

1. Open a notebook with a query cell.
2. Click the in-cell datasource selector.
3. Confirm each option shows the brand logo (e.g. postgres elephant, mongo leaf, s3 bucket).
4. Pick one. Confirm the selector trigger also displays the logo + name.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
