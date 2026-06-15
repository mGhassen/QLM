---
spec: docs/specs/0005-contextual-help-panels-phase1.md
spec_sections:
  - "#32-screen-by-screen"
  - "#73-layout-ui-packagesui"
  - "#76-legacy-routes-touched-only-because-of-the-documentationitem-type-deletion"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks:
  - 005-wire-integrations-first-consumer
blocked_by:
  - 002-extend-app-registry-contract
---

# Rewire layout docs panel

## Goal

Rewrite `DocumentationPanel` to accept a single React node instead of a static items list, lift the `activePanel` state out of `ProjectShellLayout` so the host (wrapped in a `DocsPanelProvider`) owns it, and propagate the prop rename through the layout chain.

## Scope

**In scope**
- `DocumentationPanel` rewrite — props become `Readonly<{ page: ReactNode | null }>`; chrome (`BookOpen` icon + "Documentation" title) unchanged; placeholder when `page === null`
- `RightSidebar`, `RootLayout`, `ProjectShellLayout` — swap `documentationItems?: DocumentationItem[]` for `docsPanelContent?: ReactNode`
- `ProjectShellLayout` state lift — accept `activePanel` + `onPanelChange` as props; remove local `useState<ActivePanel>`
- Delete the `DocumentationItem` type export from `packages/ui/src/guepard/layout/index.ts`
- Fix the two legacy route files that were still importing the old type
- Update the project-shell Storybook story to use the new prop shape and wrap in a minimal `DocsPanelProvider` where needed

**Out of scope**
- `@guepard/ui/markdown` component → story 004
- Integrations plugin wiring → story 005

## Acceptance criteria

- [x] `DocumentationPanel` renders the placeholder when `page === null` and the page node when non-null
- [x] `ProjectShellLayout` no longer owns `activePanel` state — it accepts it as props
- [x] `RootLayout` still owns its own `activePanel` state for org-level pages (the state lift is scoped to `ProjectShellLayout`)
- [x] `DocumentationItem` type is gone from `packages/ui/src/guepard/layout/index.ts`
- [x] `pnpm --filter @guepard/ui typecheck` + `pnpm --filter web typecheck` green on top of the baseline
- [x] `Shell / ProjectShell / Default` Storybook story renders without crashing

## Tasks

Shipped files:

- `packages/ui/src/guepard/layout/documentation-panel.tsx` — rewrite
- `packages/ui/src/guepard/layout/right-sidebar.tsx` — `documentationItems` → `docsPanelContent?: ReactNode`
- `packages/ui/src/guepard/layout/root-layout.tsx` — same prop swap, keeps local `activePanel` state
- `packages/ui/src/guepard/shell/project-shell-layout.tsx` — remove local `useState`, accept props, swap the prop
- `packages/ui/src/guepard/layout/index.ts` — remove `DocumentationItem` type export
- `apps/web/src/routes/org/$slug.tsx` — drop the legacy `documentationItems` mock
- `apps/web/src/routes/org/$slug/project/$projectSlug.tsx` — same
- `packages/ui/src/guepard/shell/project-shell.stories.tsx` — use the new `docsPanelContent` prop; minimal `DocsPanelProvider` wrap

## Demo / verification

```bash
pnpm --filter @guepard/ui typecheck
pnpm --filter web typecheck
pnpm --filter @guepard/ui storybook  # open Shell / ProjectShell / Default
```

Storybook renders without crashing; passing a `<Markdown source="..." />` into `docsPanelContent` shows it inside the panel.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
