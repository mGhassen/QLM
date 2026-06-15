# RFC 0005 — Contextual help panels in the project shell

| Field      | Value                                                                     |
| ---------- | ------------------------------------------------------------------------- |
| Status     | Accepted — phase 1 shipped 2026-04-11                                     |
| Author     | Hani Chalouati                                                            |
| Created    | 2026-04-11                                                                |
| Target     | Phase 1 — plugin-root help contract + docs panel auto-open + shared markdown |
| Supersedes | —                                                                         |
| Related    | [RFC 0001 — Integrations](./0001-integrations.md) (first consumer)        |

## 1. Summary

Turn the right-sidebar **Documentation panel** in the project shell from a static, host-owned list of external links into a **view-contextual surface** that each plugin app contributes to. A plugin exports a `HelpPages: Record<string, ComponentType>` map alongside its `default` / `FlatRoot` exports; the shell resolves `(routeBase, pageId) → ComponentType` at runtime and renders the chosen page inside the existing panel. Plugins call `useDocsPanel().open(pageId)` to force-open the panel and select a page — typically from a `useEffect` that reacts to internal state (e.g. "the user just picked AWS in the integration create flow").

Phase 1 ships:

- A plugin-root export contract (`HelpPages`) discovered by the existing app registry.
- A shell-runtime `DocsPanelContext` + `useDocsPanel()` hook.
- A rewritten `DocumentationPanel` that accepts a React node instead of a static items list.
- A state lift out of `ProjectShellLayout` so the `DocsPanelProvider` owns `activePanel`.
- A shared `@guepard/ui/markdown` component so help pages (and any other package) can render markdown uniformly.
- Deletion of the four hardcoded mock "documentation items" that previously lived in `project-shell-host.tsx`.

Integrations (RFC 0001) is the **first consumer** of the contract — it ships two markdown help pages and auto-opens them from the provider-picker effect — but the contract belongs to the shell.

## 2. Motivation

In RFC 0001 (Integrations), users need to see the IAM permissions required by AWS access keys or a GCP service account **before they paste credentials**. The first attempt rendered an inline info box next to each form. That was the wrong shape:

1. It duplicated copy inside the plugin-specific form component when the shell already has a dedicated place for documentation — the right-sidebar panel.
2. It did not scale: every future plugin would reinvent its own help-box component, diverge on styling, and bury contextual help inside its own UI tree.
3. It ignored a latent architectural signal: the four hardcoded "documentation items" in `project-shell-host.tsx` (install the CLI, connect a database, create a branch, run a query) are throwaway mocks. The panel was waiting for a real content contract.

The real shape is: **the plugin that knows what help the user needs contributes the pages; the shell renders them**. That flips the ownership from the host to the plugin, aligns with the existing `FlatRoot` / `resolveProjectContext` sibling-export pattern on `plugin-root.tsx`, and gives every future plugin a free docs surface without touching host code.

A secondary motivation: the console has no shared markdown renderer today. Every place that wants to display rich text rolls its own `react-markdown` config, and the integrations help pages were the forcing function to extract that into `@guepard/ui/markdown`.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- **Plugin-root contract**: a plugin can export `HelpPages: Record<string, ComponentType>` alongside `default` / `FlatRoot` / `resolveProjectContext`. The existing Vite-glob app registry picks it up with zero new config.
- **Runtime wiring**: `useDocsPanel().open(pageId)` force-opens the panel and selects a page; `.close()` closes it. The hook throws if called outside a `DocsPanelProvider` — no silent no-op.
- **Panel rewrite**: `DocumentationPanel` accepts a React node (the active help page) instead of a static items list. Chrome stays unchanged (`BookOpen` icon + "Documentation" title).
- **State lift**: `ProjectShellLayout` accepts `activePanel` + `onPanelChange` as props. The host (`project-shell-host.tsx`) owns the state and wraps the layout in `<DocsPanelProvider>` so the hook's `open(...)` flips `activePanel` to `'documentation'`.
- **Shared markdown component**: `@guepard/ui/markdown` subpath export, a thin wrapper around `react-markdown` + `remark-gfm` with default prose classes and targeted overrides for code blocks. Works at any container width, including the ~360 px docs panel.
- **First consumer wired up**: integrations exports `HelpPages = { 'aws-permissions': ..., 'gcp-permissions': ... }` and calls `docs.open('aws-permissions' | 'gcp-permissions')` from a `useEffect` on the provider state.
- **Deletion of the mock items**: the four hardcoded `documentationItems` entries in `project-shell-host.tsx` are removed; nothing else in the tree was using the old static-list prop.

### 3.2 Non-goals (phase 1)

- **Deep linking**. Help pages aren't URL-routable — they open via `useDocsPanel().open(pageId)`. A `?docs=aws-permissions` query param is straightforward to add later. Phase 2.
- **Page list / breadcrumbs inside the panel**. The panel shows one page at a time. When the user switches from AWS to GCP, the page swaps. There is no "back to list" because there is no list. Phase 2 if a plugin ever needs more than one page on screen at once.
- **Manifest-level metadata**. Help pages do not get a `PluginManifest.helpPages` field with human-readable titles. The contract is a pure plugin-root export for now. Phase 2 if a future picker UI needs titles at the manifest level.
- **Assistant panel changes**. The `ActivePanel === 'assistant'` branch is untouched — this RFC is strictly about the documentation branch of the union.
- **Per-locale help content**. Help markdown is shipped in English only in phase 1. i18n-aware help pages (either an `HelpPages: Record<string, Record<locale, ComponentType>>` or a nested key shape) are a follow-up.

## 4. Prior art in the codebase

- **Plugin-root sibling exports** (`apps/web/src/shell/app-registry.ts`) — the registry already picks up `default` + `FlatRoot` + `resolveProjectContext` from plugin-root modules via `import.meta.glob(..., { eager: true })`. `HelpPages` slots into the exact same pipeline — no new discovery code.
- **`DocumentationPanel` + `RightSidebar`** (`packages/ui/src/guepard/layout/*`) — already implement the panel chrome, the icon, the title, and the `ActivePanel` state union. This RFC rewires what they render, not how they're framed.
- **`ProjectShellLayout`** (`packages/ui/src/guepard/shell/project-shell-layout.tsx`) — owned `activePanel` locally. Lifting that state up was the enabling change for this RFC.
- **`@guepard/shell-runtime`** — already the home of `useShell()` + typed resources. Adding a second context (`DocsPanelContext`) here is consistent with the layer's responsibility: plugin-to-shell React-aware glue.
- **`react-markdown`** is already a dependency via earlier assistant work. This RFC formalises it as a `@guepard/ui/markdown` subpath export so other packages stop re-vendoring the config.
- **Throwaway mocks in `project-shell-host.tsx`** — the four hardcoded `documentationItems` entries (install CLI / connect database / create branch / run query) are replaced, not reshaped. They were acknowledged as placeholders during the shell migration.

## 5. Conceptual model

Three primitives:

1. **A help page** is a React component exported from a plugin. The plugin owns its content and chooses its key (`aws-permissions`, `gcp-permissions`, `query-tips`, …). Keys are plugin-local — `(routeBase, pageId)` is the globally unique identifier.
2. **The docs panel** is a shell-owned surface that renders **zero or one help page at a time**. It does not know who contributed the active page, only what React node to draw inside its chrome.
3. **The docs panel context** is the bridge: it holds `activePageId` + `open(pageId) / close()`. Plugins call it through `useDocsPanel()`. The host owns the state and bridges the `open(...)` call back into `activePanel = 'documentation'` so the sidebar panel flips open.

Lifecycle: the user navigates to a plugin → the plugin's view renders → (optionally) a `useEffect` fires and calls `docs.open(pageId)` → the host resolves `(currentRouteBase, pageId) → ComponentType` via the app registry → `<ActivePage />` renders inside the panel → the user closes the panel (or navigates away) and the page disappears.

When the user switches plugins, `activePanel` stays whatever it was (sticky), but the resolved `(routeBase, pageId)` naturally changes because `currentRouteBase` changed. If the new plugin has no help page registered for the old `pageId`, the panel shows a short placeholder ("Select an app feature to see contextual help") until the plugin calls `open(...)` with one of its own keys.

## 6. Architecture overview

```
packages/apps/<plugin>/src/plugin-root.tsx
    │  exports: default, FlatRoot?, resolveProjectContext?, HelpPages?
    ▼
apps/web/src/shell/app-registry.ts
    │  buildEntries() copies HelpPages into PluginRegistryEntry
    │  getHelpPage(routeBase, pageId) → ComponentType | null
    ▼
apps/web/src/shell/project-shell-host.tsx
    │  owns activePanel state
    │  wraps children in <DocsPanelProvider onOpenChange={...}>
    │  computes <ActiveHelpPage /> via getHelpPage(activeRouteBase, activePageId)
    ▼
packages/ui/src/guepard/shell/project-shell-layout.tsx
    │  accepts activePanel + onPanelChange + docsPanelContent props
    ▼
packages/ui/src/guepard/layout/right-sidebar.tsx → documentation-panel.tsx
    │  renders the React node (or a placeholder when null)
    ▼
packages/ui/src/guepard/markdown.tsx
    │  used by help-page components to render .md content
```

## 7. Rollout plan

| Phase | Scope                                                                                         | Artifacts                                                 | Status |
| ----- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------ |
| 1     | Plugin-root contract, runtime hook, panel rewrite, shared markdown component, integrations as first consumer | This RFC + [spec](../specs/0005-contextual-help-panels-phase1.md) | Shipped |
| 2     | Deep linking via `?docs=<pageId>` query param; per-locale help content; optional manifest-level titles | Phase 2 RFC                                               | Future |

## 8. Open questions

Resolved during spec drafting. Left here for historical completeness.

1. **Manifest field vs plugin-root sibling export.** The `HelpPages` contract could have lived on `PluginManifest` (visible to the manifest consumer) or as a plugin-root sibling export (visible only after the module is eagerly imported). **Resolution**: sibling export, matching `FlatRoot` / `resolveProjectContext`. The app registry already eagerly imports every plugin-root module, so there is no cost difference, and the symmetry is valuable.
2. **Hook strictness.** Should `useDocsPanel()` throw if called outside a provider, or return a no-op? **Resolution**: throw. A no-op hook masks bugs where the host forgot to wrap its tree. Storybook decorators that need to render plugin components outside the real shell supply a minimal `DocsPanelProvider` themselves.
3. **Close-on-unmount.** When the user leaves the integration create flow, should the panel auto-close? **Resolution**: no. The panel's open/closed state is user-driven. An effect that auto-closes would fight the user's intent ("I opened this to read it, leave it alone").

## 9. Alternatives considered

- **Keep the static documentation items list.** Rejected. The items were always placeholders, and a static global list cannot answer "what does the user need help with *right now*".
- **Put `HelpPages` on `PluginManifest`.** Rejected — see §8.1. No value over the sibling export, adds asymmetry.
- **Let plugins render their own floating help popover.** Rejected. Every plugin reinventing the same chrome is exactly the anti-pattern this RFC fixes.
- **Markdown renderer in `shell-runtime` instead of `ui`.** Rejected. Markdown rendering is a presentation concern; other packages (tooltips, notifications, assistant) will want it too. `@guepard/ui/markdown` is the right home.

## 10. References

- `.claude/rules/hexagonal-architecture.md` — layering rules (`ui` ⊂ `shell-runtime` consumer; this RFC respects both).
- `apps/web/src/shell/app-registry.ts` — Vite-glob app discovery; the contract this RFC extends.
- `packages/ui/src/guepard/layout/documentation-panel.tsx` — panel chrome reused as-is.
- `packages/ui/src/guepard/shell/project-shell-layout.tsx` — state-lift target.

---

## Review checklist for the author

- [x] Does §1 make the contract obvious in one paragraph?
- [x] Is every §3.1 goal observable in shipped code?
- [x] Is every §3.2 non-goal pinned to a named future phase?
- [x] Does §4 distinguish reused prior art from replaced prior art (the mock items)?
- [x] Would a newcomer understand the concept after reading §1 + §5 alone?
- [x] Are the open questions real decisions, resolved in §1 of the spec?

---

## Amendments

None. The RFC was reconstructed retroactively from the implementation history as part of the 2026-04-11 SDD reconciliation pass; no deviations have landed after that date.
