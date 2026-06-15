# RFC 0027 — VS Code-style tab system

Status: draft
Owner: shell
Date: 2026-04-28

## Why

The current tab system is URL-derived, single-pane, and bug-prone:

1. **Stale tab content.** Tabs of the same routeBase share one `<Root />`
   instance because `<Root />` is unkeyed. Any `useState` inside the page
   (`detailsId`, `createOpen`, `paletteOpen` in
   `packages/features/ops/infrastructure/.../list-page.tsx`) leaks across
   tabs, producing the user-reported "click tab → wrong content" bug.
2. **Cross-handler URL leakage.** Topology → infrastructure handoff
   replaces `search` with a literal, dropping unrelated params and
   leaving stale ones on subsequent calls.
3. **Identity scattered across routes.** `tid ?? routeBase`,
   `${prefix}:${param}`, `agent:${slug}` all built by hand. No central
   `getTabKey`. Easy to introduce a tab id collision.
4. **Sidebar active marker mis-derived.** Pre-fix it compared `routeBase
   === activeTabId` even when `activeTabId` was a `tid` — sidebar dark
   on virtual tabs.
5. **No preview slot, no MRU, no sticky region invariant.** The current
   `pinned` flag is a per-tab boolean; VS Code's pinned/preview duality
   and "sticky is a contiguous prefix" invariant are absent.

The phase-0 patch lands `key={tabKey}` on each pane (forces remount),
centralizes `getTabKey` in `@qlm/shell-contracts`, fixes topology
leakage, and patches the sidebar active marker. These eliminate the
user-visible breakage but lose tab-local state on every switch. The
next phase adopts VS Code's per-pane mounted model.

References (extracted by the team):
`docs/vs-code/vscode-tabs/{a,b,c,d,f,i}` on the user's desktop. The
most relevant sources for this RFC:

- `a/identity-and-matching.md` — canonical tab key, `matches`, "direct
  match wins over composite match"
- `a/chapter-a-group-state-machine.md` — group model invariants
- `a/preview-vs-pinned.md` — preview slot semantics
- `a/sticky-tabs.md` — sticky as contiguous prefix
- `d/editor-service-open-routing.md` — open routing pipeline
- `d/multi-editor-tabs-strip.md` — DOM and interactions

## What

Adopt VS Code's mental model in three layers:

### Layer 1 — model (already partially in place)

A canonical, observable `EditorGroupModel` per project shell. Owns:

- `tabs: ShellTabRecord[]` — sequential order
- `mru: string[]` — most-recently-active tab keys
- `activeKey: string | null` — first element of selection
- `selection: string[]` — multi-select; first is active
- `previewKey: string | null` — VS Code preview slot (single, replaceable)
- `stickyCount: number` — `tabs[0..stickyCount-1]` are sticky; contiguous prefix invariant
- `transient: Set<string>` — ephemeral overrides

Transitions emit typed change events. URL is a SIDE EFFECT of model
transitions, not the source of truth — the model triggers
`navigate({...})` after mutating itself, never the other way around.

Implementation: small Zustand store under
`packages/shell-runtime/src/tabs/`. Persists per-project via
sessionStorage (already partially implemented in `project-shell-host`).

### Layer 2 — controller / open routing

`openTab(descriptor, options)` implements VS Code's `openEditor`
pipeline (see `d/editor-service-open-routing.md`):

1. Resolve `descriptor` → canonical `tabKey` via `getTabKey`.
2. `findTab(key)` — VS Code's `indexOf` / `findEditor` analog. If a tab
   matches, **activate** instead of creating a duplicate.
3. Else honor `options.preview`:
   - `preview: true` and a preview slot exists → close-replace.
   - else create new tab; `previewKey = newKey` if preview requested.
4. Apply `options.position` (`'after-active' | 'end' | index`) — see
   VS Code's `EditorOpenPositioning`.
5. Mutate model → emit `onDidModelChange`.
6. Side effect: if URL doesn't already point at the new tab, navigate.

### Layer 3 — UI: per-pane mounted, hidden when inactive

The breaking change. Today: one `<Root />`, swapped on URL change.
Target: every open tab gets its own React subtree, mounted once,
hidden via `display: none` when inactive.

```tsx
{tabs.map((tab) => (
  <div key={tab.key} hidden={tab.key !== activeKey}>
    <PaneFor tab={tab} />
  </div>
))}
```

Consequences:

- Tab-local `useState` survives switches (sheets stay open, scroll
  preserved, palettes cached). Matches user expectation of a
  browser-tab / VS-Code-editor.
- Initial mount cost per opened tab. Mitigation: lazy-mount on first
  activation; keep mounted until close.
- Each pane runs its own queries. Need a per-tab React Query scope or
  agreed shared cache (existing app-wide `QueryClient` is fine).
- Memory footprint grows with open-tab count. Cap at a soft limit (VS
  Code: `workbench.editor.limit.value`); LRU-evict idle tabs beyond
  the limit, replaced by a placeholder that re-mounts on activation.

### Layer 4 — features ported from VS Code (incremental)

Order roughly by user-perceived value:

1. **Preview slot.** Single-click in a list opens preview; double-click
   pins. Today every "Open in tab" is a permanent tab → tab-bar
   bloat.
2. **MRU navigation.** Ctrl+Tab cycles MRU; matches VS Code +
   browsers.
3. **Sticky prefix invariant.** Pinning moves the tab into the sticky
   region; the region stays a contiguous prefix.
4. **Drag and drop.** Reorder, drag-into-side-group later (depends on
   layer 1 modeling groups, currently single-group only).
5. **`replaceEditors`** equivalent for in-place swaps (e.g. promoting
   preview to pinned without flicker).
6. **Multi-select + range.** Shift-click range, Cmd/Ctrl-click toggle.
   Today the tab bar exposes `onTabReorder` and basic close; no bulk
   ops.
7. **Workspace persistence.** Per-project session restore mirrors VS
   Code's editor area memento (`f/chapter-f-persistence.md`).

## Migration

The phase-0 patch is forward-compatible. `getTabKey` already lives in
`@qlm/shell-contracts`; layer-1 model adoption replaces the
`useState`+`sessionStorage` pair inside `project-shell-host` with a
shell-runtime store reading the same keys. The per-pane mount switch
is a single change in the shell host's children-rendering path —
plugins are not affected because they already accept their full state
from URL + shell context.

## Out of scope (later RFCs)

- Multi-group splits (VS Code Chapter C). Single group is enough.
- Aux windows / drag-out-to-window.
- Modal editor part.
- Side-by-side editors / diff editors.

## Open questions

- Cap on simultaneously mounted panes? Suggestion: 12 active + LRU.
- Where do unsaved changes live? Today no plugin owns dirty state;
  defer until first plugin needs it.
- Preview or pinned default for sidebar clicks? VS Code: file open
  from the explorer is preview. Suggested mapping: sidebar click →
  pinned (the user picked it deliberately); list-row click within an
  app → preview.
