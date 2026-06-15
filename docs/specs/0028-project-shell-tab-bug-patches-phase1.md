# Spec — Project shell tab bug patches (phase 1)

| Field        | Value                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Status       | Draft                                                                                            |
| Author       | shell                                                                                            |
| Created      | 2026-04-29                                                                                       |
| Implements   | [RFC 0028 — Project shell tab bug patches](../rfcs/0028-project-shell-tab-bug-patches.md)        |
| Target phase | Phase 1                                                                                          |

This document is the implementation spec for RFC 0028. The RFC establishes the *why* and *shape*; this spec defines the *what* and *how*: resolved open questions, file-by-file work items, and a verification plan.

Scope is strict to phase 1. RFC 0027's persistent-pane work is explicitly out of scope.

---

## 1. Resolved open questions

The RFC opened with no unresolved questions. The two upstream decisions made during planning are recorded here so the spec is self-contained:

| # | Question                                                                | Resolution for phase 1                                                                                                  |
| - | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1 | What does `getTabKey` return for malformed `tid`?                       | A sentinel string `${routeBase}#invalid:${tid}`. Never collapses onto the clean `routeBase` identity.                   |
| 2 | How is the dnd activator scoped on the project-shell tab bar?           | Leading 12-pixel `GripVertical` icon, hidden by default, revealed at `opacity-50` on tab-button hover. `setActivatorNodeRef` lifted from `packages/features/notebook/src/components/notebook-ui.tsx:194-301`. |

## 2. User stories

- As a user clicking on a project-shell tab, I land on that exact tab. The tabs do not shuffle and the active marker does not jump to a neighbor.
- As a user typing into a list-page filter, the shell stays smooth. No per-keystroke storage writes, no per-keystroke tab-bar re-render storm.
- As a user opening a `/prj/<slug>/<routeBase>?tid=<garbage>` link, the broken URL renders on its own visible tab and does not poison the clean `routeBase` tab.

## 3. Functional flow

### 3.1 Information architecture

No change. The project-shell tab bar lives at the top of every `/prj/<slug>/...`, `/<flatPrefix>/...`, and `/agent/<slug>` route. The host stays in `apps/web/src/shell/project-shell-host.tsx`. The bar component stays in `packages/ui/src/guepard/shell/project-shell-tab-bar.tsx`.

### 3.2 Screen-by-screen

**Project-shell tab bar.** New visual: a leading 12-pixel `GripVertical` icon on every unpinned tab, `opacity-0 group-hover:opacity-50 cursor-grab`. Pinned tabs are unchanged (the pin icon is the activator). Title region, close button, context menu, middle-click close — all unchanged.

### 3.3 User flows (happy paths)

1. **Click an inactive tab.** Pointer down on the title region. Pointer up. `onTabClick(tab.id)` fires once. Host receives the click, navigates, the new tab activates.
2. **Drag-reorder a tab.** Pointer down on the grip. Move ≥5 pixels. Drop on another tab. `onTabReorder(activeId, overId)` fires. The bar updates order via `setOpenTabs`.
3. **Click the currently-active tab.** No-op. `handleTabClick` short-circuits.
4. **Type into a filter on a list page.** URL search-params change; the host's debounced href settles 150 ms after the last keystroke; `setOpenTabs` writes once; `sessionStorage.setItem` fires once.

### 3.4 Error and edge-case behaviour

- **Malformed `tid`.** Renders on the sentinel tab. Bar shows two tabs: the clean `routeBase` and the sentinel `routeBase#invalid:<tid>`. User can close either independently.
- **Quick double-click.** First click navigates; second click hits the short-circuit and is dropped. No double-navigate, no stack of `setOpenTabs` calls.
- **Drag-cancel mid-gesture.** PointerSensor releases without firing `onTabReorder`. `onClick` does not fire either (drag was activated). No state change. The user retries.

## 4. Technical flow

### 4.1 Layered sequence diagrams

No domain or server flow. All work is presentation + shell layer. The three diffs are independent:

- **Story 001 — `tab-key.ts`.** Pure function. Unit-tested in `packages/shell-contracts`.
- **Story 002 — `project-shell-tab-bar.tsx`.** UI primitive in `packages/ui`. Storybook + interaction test.
- **Story 003 — `project-shell-host.tsx`.** Host-layer in `apps/web`. UI smoke against `/prj/<slug>/infrastructure`.

### 4.2 Component split

No change to the layering. Stays:

- `packages/shell-contracts` — identity contract.
- `packages/ui/src/guepard/shell/*` — generic shell primitives.
- `apps/web/src/shell/*` — host glue.

## 5. API contracts

No HTTP, no DTO, no port change. The only contract change is the return value of `getTabKey({ kind: 'contextual', tid })` when `decodeTabId(tid)` returns null:

| Before                | After                                  |
| --------------------- | -------------------------------------- |
| `descriptor.routeBase` | `${descriptor.routeBase}#invalid:${descriptor.tid}` |

Callers that compare the result with `tabKeyMatches(a, b)` continue to work — the function is `===` today and stays that way. No caller currently special-cases the malformed-fallback behavior, so widening the return alphabet is safe.

## 6. Data model

No schema change. `sessionStorage` payload shape unchanged.

## 7. Stories

Three stories, each a vertical slice.

| ID  | Title                                  | Slice                                                                                                          | Tasks |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----- |
| 001 | `fix-tab-key-malformed-tid`            | `tab-key.ts` fallback + invert empirical probe to regression test                                              | 1     |
| 002 | `fix-tab-bar-dnd-grip-handle`          | `project-shell-tab-bar.tsx` activator scope + new Storybook + interaction tests                                | 3     |
| 003 | `fix-shell-host-render-storm`          | `project-shell-host.tsx` split sync effect, debounced href, `handleTabClick` short-circuit                     | 2     |

Story 001 lands first (smallest blast radius). Story 002 second. Story 003 last (depends on neither prior story but is independently the highest-impact perf fix).

## 8. Verification plan

Each story has its own `Demo / verification` block. The phase-1 acceptance test, run from `main` after all three stories merge:

1. **Typecheck.** `pnpm typecheck` → green.
2. **Tests.** `pnpm test` → all of `tab-key.empirical.test.ts` and the new `project-shell-tab-bar.test.tsx` green.
3. **Storybook.** `pnpm --filter @guepard/ui storybook` → three new stories render; clicks fire `onTabClick`; grip drags fire `onTabReorder`.
4. **Manual smoke.**
   - `/prj/<slug>/infrastructure?tid=garbage` lands on a sentinel tab. The clean tab is still in the bar.
   - Typing 20 chars into a filter records ≤2 sessionStorage writes in DevTools Performance.
   - Clicking each tab activates that exact tab; no shuffle, no neighbor jump.
5. **Hex review.** `/finish` story branch invokes `hex-architecture-reviewer` for each story; all three pass — no domain pollution, no port skips, no apps importing host code.
6. **Main stabilizer.** Post-merge, `main-stabilizer` runs `pnpm check` on `main` and confirms green.

## 9. Changelog

Empty. Populated by `/finish-story` if any story flags `Spec-accuracy check: no`.
