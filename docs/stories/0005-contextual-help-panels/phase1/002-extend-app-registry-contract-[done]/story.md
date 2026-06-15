---
spec: docs/specs/0005-contextual-help-panels-phase1.md
spec_sections:
  - "#51-helppages-plugin-root-export"
  - "#52-pluginrootmodule--pluginregistryentry-additions"
  - "#72-app-registry-appsweb"
status: done
started: 2026-04-11
finished: 2026-04-11
blocks:
  - 003-rewire-layout-docs-panel
  - 005-wire-integrations-first-consumer
blocked_by:
  - 001-add-docs-panel-context
---

# Extend app registry contract

## Goal

Teach the host app registry about the new `HelpPages` sibling export on plugin-root modules and wire the host's `project-shell-host.tsx` to own the `activePanel` state, resolve the active help page via the registry, and hand it to the layout.

## Scope

**In scope**
- Extend `PluginRootModule` with `HelpPages?: Record<string, ComponentType>`
- Extend `PluginRegistryEntry` with `helpPages?: Record<string, ComponentType>`
- Copy `rootModule?.HelpPages` into the entry inside `buildEntries()` using the same eager-import path as `FlatRoot`
- Add `AppRegistry.getHelpPage(routeBase, pageId): ComponentType | null`
- Rewire `project-shell-host.tsx` to:
  - Delete the four hardcoded `documentationItems` mocks
  - Own `activePanel` state locally (`useState<ActivePanel>(null)`)
  - Wrap children in `<DocsPanelProvider onOpenChange={open => setActivePanel(open ? 'documentation' : null)}>`
  - Render an inner `<ActiveHelpPage />` component that calls `useDocsPanel()` + `registry.getHelpPage(activeRouteBase, activePageId)`

**Out of scope**
- Layout prop changes (still rendering the old `documentationItems` shape until story 003 lands) → story 003
- Shared markdown component → story 004

## Acceptance criteria

- [x] A plugin that exports `HelpPages` from `plugin-root.tsx` is automatically discovered by the registry with zero config changes in the host
- [x] `registry.getHelpPage('integrations', 'aws-permissions')` returns the expected component type (once story 005 ships the plugin)
- [x] The four hardcoded `documentationItems` are deleted from `project-shell-host.tsx`
- [x] `pnpm --filter web typecheck` green on top of the baseline

## Tasks

Shipped files:

- `apps/web/src/shell/app-registry.ts` — `PluginRootModule` extension, `PluginRegistryEntry` extension, `buildEntries()` wiring, `getHelpPage(routeBase, pageId)` method
- `apps/web/src/shell/project-shell-host.tsx` — delete `documentationItems` mock, own `activePanel` state, wrap in `<DocsPanelProvider>`, add `<ActiveHelpPage />` inner component using `useDocsPanel()` + `registry.getHelpPage()`

## Demo / verification

```bash
pnpm --filter web typecheck
```

After story 005, loading the integrations plugin surfaces both help pages via `registry.getHelpPage(...)`.

## Questions surfaced

- None.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped.

Spec accurate: **yes**.
