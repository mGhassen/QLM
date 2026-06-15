# Spec — Contextual help panels (phase 1)

| Field          | Value                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| Status         | Shipped — 2026-04-11                                                                   |
| Author         | Hani Chalouati                                                                         |
| Created        | 2026-04-11                                                                             |
| Implements     | [RFC 0005 — Contextual help panels](../rfcs/0005-contextual-help-panels.md)            |
| Target phase   | Phase 1 — plugin contract + runtime hook + panel rewrite + shared markdown + first consumer |
| Stories        | [`docs/stories/0005-contextual-help-panels/phase1/`](../stories/0005-contextual-help-panels/phase1/) |

This document is the implementation spec for RFC 0005. The RFC establishes the *why* and *shape*; this spec defines the *what* and *how*: resolved open questions, the plugin-root contract, the `DocsPanelContext` API, the panel rewrite, the shared markdown component, and the integrations first-consumer wiring.

Scope is strict to phase 1. Deep linking, per-locale content, and manifest-level titles are deferred.

---

## 1. Resolved open questions

| # | Question                              | Resolution for phase 1                                                                                                       |
| - | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1 | Manifest field vs sibling export      | Plugin-root sibling export `HelpPages: Record<string, ComponentType>`, matching `FlatRoot` / `resolveProjectContext`.        |
| 2 | Hook strictness                       | `useDocsPanel()` throws if called outside a `DocsPanelProvider`. Storybook decorators that need plugin components supply a minimal provider themselves. |
| 3 | Close-on-unmount                      | No. The panel's open/closed state is user-driven. Navigating away leaves the panel as the user left it.                      |

---

## 2. User stories

- As a **plugin author**, I can add one or more help pages to my app by exporting a `HelpPages` map from `plugin-root.tsx`, without touching the host or the shell.
- As a **plugin author**, I can force-open the docs panel on a specific page from inside my component tree via `useDocsPanel().open(pageId)`.
- As a **user** of any project-shell app, when a plugin opens a help page I see contextual documentation in the existing right-sidebar panel, styled consistently regardless of which plugin contributed it.
- As a **user**, I can close the panel with the topbar button at any time, and it stays closed until another plugin (or I) explicitly reopens it.
- As a **plugin author** (or any package author), I can render arbitrary markdown (GFM + code blocks + tables) via `<Markdown source={...} />` from `@guepard/ui/markdown`, without reconfiguring `react-markdown` myself.

---

## 3. Functional flow

### 3.1 Information architecture

- Help pages live inside the plugin package (`packages/apps/<name>/src/help/*`), sibling to the plugin's own view components.
- The shell's existing right-sidebar `DocumentationPanel` is unchanged visually (`BookOpen` icon + "Documentation" title). What changes is **what it renders**: the shell now draws a single React node supplied from above, instead of iterating over a static items list.
- Nothing about the left sidebar, topbar, or tab bar changes.

### 3.2 Screen-by-screen

#### DocumentationPanel (rewrite)

- **Props**: `Readonly<{ page: ReactNode | null }>`.
- **Body**:
  - When `page` is a React node → renders it inside a scrollable container with `px-5 py-6`.
  - When `page` is `null` → renders a short placeholder paragraph ("Select an app feature to see contextual help").
- **States**:
  - *Empty*: `page === null`. Placeholder visible.
  - *Populated*: `page !== null`. Active help page component is rendered.
  - *Loading / error*: the panel does not own these. The help-page component itself is responsible for its own states (in practice, markdown-backed pages are pre-imported via `?raw`, so they have no loading state).

### 3.3 User flows (happy path)

1. User opens a plugin (e.g. Integrations → New integration).
2. User picks a provider (e.g. AWS).
3. The plugin's `useEffect` fires and calls `docs.open('aws-permissions')`.
4. The host resolves `(routeBase='integrations', pageId='aws-permissions')` via the app registry → returns `AwsPermissionsHelp` component.
5. Host flips `activePanel` to `'documentation'` (via `onOpenChange(true)` from the provider).
6. Docs panel opens; `<AwsPermissionsHelp />` renders inside, showing the AWS IAM permissions markdown.
7. User switches to GCP → step 3 fires again with `'gcp-permissions'` → the page swaps, the panel stays open.
8. User clicks the topbar docs button → `activePanel = null` → panel closes.

### 3.4 Error and edge-case behaviour

- **Plugin has no matching help page**. `registry.getHelpPage(routeBase, pageId)` returns `null`. Host renders the placeholder instead of the page. The `open(...)` call still flipped `activePanel`, so the panel opens, but it shows "Select an app feature to see contextual help". Acceptable phase-1 behaviour; a plugin that opens a non-existent page id has a bug.
- **Hook called outside the provider**. `useDocsPanel()` throws. Developer sees a loud error in dev; Storybook stories that render plugin components must wrap them in a `DocsPanelProvider`.
- **Plugin unmounts while panel is open**. The active page component unmounts; the host keeps `activePageId` but `getHelpPage` may return `null` for the new `routeBase`. The panel falls back to the placeholder, and the user can close it manually.

---

## 4. Technical flow

### 4.1 Sequence — plugin opens a help page

```
Plugin component                                    Host (DocsPanelProvider)                   Layout                     Panel
    │                                                         │                                    │                        │
    │  useDocsPanel().open('aws-permissions')                  │                                    │                        │
    ├─────────────────────────────────────────────────────────▶│                                    │                        │
    │                                                         │  setActivePageId('aws-permissions')│                        │
    │                                                         │  onOpenChange(true)                 │                        │
    │                                                         │  (host setActivePanel('documentation'))                      │
    │                                                         │                                    │                        │
    │                                                         │  activeHelpPage = registry.getHelpPage('integrations', 'aws-permissions')
    │                                                         ├───────────────────────────────────▶│                        │
    │                                                         │                                    │   page={<ActiveHelpPage />}
    │                                                         │                                    ├───────────────────────▶│
    │                                                         │                                    │                        │  renders
    │                                                         │                                    │                        │  <Markdown source={...} />
```

### 4.2 Component split

- **`packages/shell-runtime`** — owns `DocsPanelContext`, `DocsPanelProvider`, `useDocsPanel()`. No React Query, no registry lookup, no rendering. Pure state.
- **`apps/web`** — owns the `project-shell-host.tsx` wiring: `activePanel` state, `DocsPanelProvider onOpenChange`, `registry.getHelpPage()` lookup, and passing `docsPanelContent={<ActiveHelpPage />}` into the layout.
- **`packages/ui`** — owns the layout (`ProjectShellLayout`, `RightSidebar`, `DocumentationPanel`) and the new `@guepard/ui/markdown` subpath export.
- **`packages/apps/<plugin>`** — owns the help-page components (React components rendering `<Markdown source={rawMd} />`) and the `HelpPages` sibling export in `plugin-root.tsx`.

---

## 5. API contracts

### 5.1 `HelpPages` plugin-root export

```ts
// packages/apps/<name>/src/plugin-root.tsx
import type { ComponentType } from 'react';

export const HelpPages: Record<string, ComponentType> = {
  'aws-permissions': AwsPermissionsHelp,
  'gcp-permissions': GcpPermissionsHelp,
};
```

Keys are plugin-local string ids chosen by the plugin author. Values are React component types taking **no props** in phase 1.

### 5.2 `PluginRootModule` + `PluginRegistryEntry` additions

```ts
// apps/web/src/shell/app-registry.ts
type PluginRootModule = {
  default: ComponentType;
  FlatRoot?: ComponentType;
  resolveProjectContext?: ResolveProjectContextFn;
  HelpPages?: Record<string, ComponentType>;
};

type PluginRegistryEntry = {
  // … existing fields
  helpPages?: Record<string, ComponentType>;
};

class AppRegistry {
  // … existing methods
  getHelpPage(routeBase: string, pageId: string): ComponentType | null;
}
```

`buildEntries()` copies `rootModule?.HelpPages` into the entry in the same eager-import path as `FlatRoot`.

### 5.3 `DocsPanelContext` API

```ts
// packages/shell-runtime/src/docs-panel-context.tsx
export type DocsPanelContextValue = Readonly<{
  activePageId: string | null;
  isOpen: boolean;
  open: (pageId: string) => void;
  close: () => void;
}>;

export type DocsPanelProviderProps = Readonly<{
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}>;

export function DocsPanelProvider(props: DocsPanelProviderProps): React.ReactElement;
export function useDocsPanel(): DocsPanelContextValue; // throws outside provider
```

### 5.4 `@guepard/ui/markdown` API

```ts
// packages/ui/src/guepard/markdown.tsx
export type MarkdownProps = Readonly<{
  source: string;
  className?: string;
  components?: ReactMarkdownComponents;
}>;

export function Markdown(props: MarkdownProps): React.ReactElement;
```

Internally a `ReactMarkdown` + `remarkGfm` render with the default class chain:

```
prose prose-sm dark:prose-invert max-w-none
prose-pre:my-3 prose-pre:bg-muted/50 prose-code:text-xs
prose-code:before:content-[''] prose-code:after:content-['']
```

Consumers override via `className` (merged) and `components` (spread).

### 5.5 Endpoints

None. This RFC is entirely client-side.

### 5.6 Rate limiting, pagination, caching

None applicable.

---

## 6. Data model

No database changes. No migrations. Nothing in `packages/domain`.

---

## 7. File-by-file work items

### 7.1 Shell runtime (`packages/shell-runtime`)

- `src/docs-panel-context.tsx` — **new**. `DocsPanelContextValue`, `DocsPanelProvider`, `useDocsPanel` (throws outside provider).
- `src/index.ts` — **edit**. Re-export `DocsPanelProvider`, `useDocsPanel`, `DocsPanelContextValue`, `DocsPanelProviderProps`.

### 7.2 App registry (`apps/web`)

- `src/shell/app-registry.ts` — **edit**. Extend `PluginRootModule` with `HelpPages?`, extend `PluginRegistryEntry` with `helpPages?`, wire through `buildEntries()`, add `getHelpPage(routeBase, pageId)` method.
- `src/shell/project-shell-host.tsx` — **edit**. Delete the hardcoded `documentationItems` mock array. Own `activePanel` state locally. Wrap children in `<DocsPanelProvider onOpenChange={open => setActivePanel(open ? 'documentation' : null)}>`. Add an inner `<ActiveHelpPage />` component that calls `useDocsPanel()` + `registry.getHelpPage(activeRouteBase, activePageId)` and renders the result. Pass `docsPanelContent={<ActiveHelpPage />}` into the layout.

### 7.3 Layout UI (`packages/ui`)

- `src/guepard/layout/documentation-panel.tsx` — **rewrite**. Delete `DocumentationItem` type and the static-list render path. New props `Readonly<{ page: ReactNode | null }>`. Chrome unchanged.
- `src/guepard/layout/right-sidebar.tsx` — **edit**. Replace `documentationItems?: DocumentationItem[]` with `docsPanelContent?: ReactNode`. Pass `page={docsPanelContent ?? null}` to the panel.
- `src/guepard/layout/root-layout.tsx` — **edit**. Same prop swap. `RootLayout` still owns local `activePanel` state — the lift is only inside `ProjectShellLayout`.
- `src/guepard/shell/project-shell-layout.tsx` — **edit**. Remove local `useState<ActivePanel>`. Accept `activePanel` + `onPanelChange` as props. Swap `documentationItems` → `docsPanelContent?: ReactNode`.
- `src/guepard/layout/index.ts` — **edit**. Remove `DocumentationItem` export (type deleted).

### 7.4 Shared markdown (`packages/ui`)

- `src/guepard/markdown.tsx` — **new**. Thin `react-markdown` + `remark-gfm` wrapper with default prose classes + targeted code-block overrides.
- `src/guepard/markdown.stories.tsx` — **new**. Four stories: `HelpPage`, `AllFeatures`, `NarrowContainer`, `Empty`.
- `package.json` — **edit**. Add `"./markdown": "./src/guepard/markdown.tsx"` to `exports`.

### 7.5 Integrations plugin — first consumer (`packages/apps/integrations`)

- `src/help/aws-permissions.md` — **new**. Full AWS IAM permissions reference with inline links to AWS docs.
- `src/help/gcp-permissions.md` — **new**. Full GCP roles / permissions reference with inline links to GCP docs.
- `src/help/aws-permissions.tsx` — **new**. Thin wrapper: `import awsMarkdown from './aws-permissions.md?raw'; return <div className="px-5 py-6"><Markdown source={awsMarkdown} /></div>`.
- `src/help/gcp-permissions.tsx` — **new**. Mirror.
- `src/vite-env.d.ts` — **new**. `declare module '*.md?raw'` so Vite `?raw` imports type-check.
- `src/plugin-root.tsx` — **edit**. Add `HelpPages = { 'aws-permissions': ..., 'gcp-permissions': ... }` export. In `IntegrationsNewView`, add `const docs = useDocsPanel(); useEffect(() => { if (provider === 'aws') docs.open('aws-permissions'); else if (provider === 'gcp') docs.open('gcp-permissions'); }, [provider]);`.
- `src/index.ts` — **edit**. Re-export `HelpPages` (insurance — the registry already grabs it from the eager import).

### 7.6 Legacy routes (touched only because of the `DocumentationItem` type deletion)

- `apps/web/src/routes/org/$slug.tsx` — **edit**. Drop the old `documentationItems` mock list; the route uses `RootLayout` (not `ProjectShellLayout`) and keeps its own `activePanel` state — nothing about the org-level layout changes.
- `apps/web/src/routes/org/$slug/project/$projectSlug.tsx` — **edit**. Same.
- `packages/ui/src/guepard/shell/project-shell.stories.tsx` — **edit**. Storybook story updates to the new `docsPanelContent` prop; wraps the story in a minimal `<DocsPanelProvider>` when rendering components that call `useDocsPanel`.

---

## 8. Permissions and RLS

None. No database tables.

---

## 9. Security checklist

- **No secrets.** Help pages are static markdown shipped at build time.
- **XSS via markdown.** Mitigated by `react-markdown`'s default escaping + the fact that the markdown is shipped by us, not user-supplied.
- **Unsanitised HTML.** `react-markdown` does not render raw HTML by default (no `rehype-raw` plugin). Plugin authors who want HTML must opt in explicitly — not a phase-1 need.

---

## 10. Verification plan

### 10.1 Static checks

```bash
pnpm --filter @guepard/shell-runtime typecheck
pnpm --filter @guepard/ui typecheck
pnpm --filter @guepard/integrations typecheck
pnpm --filter web typecheck
```

### 10.2 Unit tests

None added in phase 1. The shell-runtime context is pure state; the hook's throw-outside-provider behaviour is covered by React Testing Library in a later phase if regressions appear.

### 10.3 Integration tests

None.

### 10.4 Storybook walk

- Open Storybook.
- `Design System / Markdown / Help page (short)` — renders AWS permissions sample.
- `Design System / Markdown / All features` — renders every GFM primitive.
- `Design System / Markdown / Narrow container (docs panel width)` — renders inside a 360px container without overflow.
- `Shell / ProjectShell / Default` — renders without crashing after the `useDocsPanel` decorator is supplied.

### 10.5 Manual smoke (dev server)

1. `pnpm web:dev` with `VITE_FEATURE_INTEGRATIONS=true`.
2. Navigate to a project → Integrations → New integration.
3. Click AWS. The docs panel on the right auto-opens and shows "Required AWS permissions" with links to AWS docs.
4. Click GCP. The page swaps to "Required GCP permissions" without the panel closing.
5. Click the topbar docs button. Panel closes.
6. Click AWS again. Panel reopens on the AWS page.

---

## 11. i18n key map

None in phase 1. Help pages are English-only; per-locale help is a phase-2 follow-up.

---

## 12. Implementation sequencing

Five vertical slices, ordered by dependency. See `docs/stories/0005-contextual-help-panels/phase1/`.

1. **001-add-docs-panel-context** — shell-runtime `DocsPanelContext` + `DocsPanelProvider` + `useDocsPanel()` (throws outside provider). Pure state, no registry lookup, no rendering. Blocks everything below.
2. **002-extend-app-registry-contract** — plugin-root `HelpPages` sibling export, `PluginRegistryEntry.helpPages`, `AppRegistry.getHelpPage(routeBase, pageId)`, `project-shell-host.tsx` wiring (owns `activePanel`, wraps in `DocsPanelProvider`, deletes the hardcoded mocks). Depends on 001.
3. **003-rewire-layout-docs-panel** — rewrite `DocumentationPanel` to accept a React node, state-lift in `ProjectShellLayout`, propagate the `documentationItems → docsPanelContent` rename. Depends on 002 (the host needs to compile first).
4. **004-create-shared-markdown-component** — `@guepard/ui/markdown` wrapper + Storybook stories. Independent of 001/002/003 — can land in parallel.
5. **005-wire-integrations-first-consumer** — AWS/GCP markdown help pages + `HelpPages` export + auto-open `useEffect`. Depends on 001–004.

---

## 13. Follow-ups (not in this spec, tracked for phase 2+)

- Deep linking via `?docs=<pageId>` URL query param.
- Per-locale help content.
- Manifest-level help-page titles for a future "browse all help" picker.
- Optional syntax highlighting in `@guepard/ui/markdown` once a plugin needs it.
- A shared `DocsPanelStoryDecorator` under `@guepard/storybook` so stories don't have to hand-wire a `DocsPanelProvider` every time.

---

## Changelog

One line per deviation from this spec discovered during implementation. Populated retroactively on 2026-04-11 from the SDD reconciliation pass.

- None. The shipped implementation matches this spec.
