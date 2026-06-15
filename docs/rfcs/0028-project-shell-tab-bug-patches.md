# RFC 0028 — Project shell tab bug patches

| Field      | Value                                                                          |
| ---------- | ------------------------------------------------------------------------------ |
| Status     | Draft                                                                          |
| Author     | shell                                                                          |
| Created    | 2026-04-29                                                                     |
| Target    | Three pre-existing user-visible defects in the project-shell tab system        |
| Supersedes | —                                                                              |
| Related    | [RFC 0027 — VS Code-style tab system](./0027-vscode-style-tab-system.md)       |

## 1. Summary

The project-shell tab system, as it stands after the phase-0 work mentioned in RFC 0027, has three independent defects that produce the user-reported symptoms "click on a tab and a neighboring tab activates", "typing into any list filter is sluggish", and "a malformed share-link silently poisons the clean tab". This RFC scopes a small, surgical patch series that fixes the three defects without altering the per-pane mounted model (`<Root key={tabKey} />`) that RFC 0027 explicitly owns and will replace in its phase 1.

Phase 1 (this RFC) ships:

- Bug A — DnD activator scope fix in the project-shell tab bar (clicks land on the right tab).
- Bug B — split + debounced sync effect in the project-shell host (no re-render storm on URL search-param updates).
- Bug C — malformed `tid` produces a distinct sentinel `tabKey` instead of collapsing onto the base routeBase identity.
- Cosmetic E — `handleTabClick` short-circuits when the clicked tab is already active.

Phase 2 and beyond — replacing `<Root key={tabKey} />` with VS Code-style persistent panes — is the exclusive domain of RFC 0027.

## 2. Motivation

The shell tab bar is the most-touched UI surface in the app. Today it misbehaves on every primary interaction:

- A user clicks a tab and the wrong tab activates, because `useSortable` listeners are spread on the same `<button>` that owns `onClick`. A 5-pixel pointer drift between mousedown and mouseup activates the drag sensor, suppresses the click, and shuffles tab order — leaving the active highlight on what looks like a "neighbor". Trackpads and shaky pointers (the realistic baseline) trigger this on most clicks.
- A user types one character into a list filter and the entire shell re-renders. The host's `useEffect` watches `location.href`; every keystroke triggers `setOpenTabs`, a `sessionStorage.setItem`, a tab-bar memo recompute, and a DnD listener re-bind. Profiling shows tens of writes per typing burst.
- A user (or a stale share link) lands on `/prj/<slug>/infrastructure?tid=<garbage>`. `getTabKey` falls back to `routeBase`, so the bogus URL silently activates the same identity slot as the clean infrastructure tab — overwriting the saved href, masking the broken state, and producing surprising back-button behavior.

These defects predate RFC 0027 in scope. RFC 0027's phase 0 already centralized `getTabKey` and added `<Root key={tabKey} />`; its phase 1 introduces persistent panes. None of those changes touch the three bugs above. Without this patch, RFC 0027's phase 1 inherits the same broken interactions, just on a different rendering substrate.

The dependency flows in only one direction: RFC 0028 lands first (small, isolated), RFC 0027 phase 1 builds on the same `getTabKey` semantics afterward.

## 3. Goals and non-goals

### 3.1 Goals (phase 1)

- A click on any tab in the project shell bar fires `onTabClick` and only `onTabClick`. Drag from a clearly-marked grip handle remains the only entrypoint to `onTabReorder`.
- Typing into any list-page filter does not write to `sessionStorage` or recompute the tab-bar memo on every keystroke. Storage and tab-bar work coalesce to one update per ~150 ms typing pause.
- A request to `/prj/<slug>/<routeBase>?tid=<garbage>` produces a distinct `tabKey` that does not collide with the clean `routeBase` tab. Both tabs coexist in the bar; closing one does not affect the other.
- `handleTabClick(activeId)` is a no-op (no navigate, no effect chain).
- `pnpm typecheck`, `pnpm test`, and the new `project-shell-tab-bar.test.tsx` are all green on `main` after the three stories merge.

### 3.2 Non-goals (phase 1)

- **Persistent per-tab pane state.** Phase 1 of RFC 0027.
- **Centralized tab open routing (`openTab(descriptor, options)`), MRU, preview slot, sticky invariant.** Phase 1 of RFC 0027.
- **Legacy `tid` short-form (`np:`, `nc:`, `node:`) decode-vs-emit asymmetry.** Documented in `tab-key.empirical.test.ts`. Belongs to a future canonical-key dedupe story under RFC 0027.
- **Per-plugin `tid` emit cleanup** in `topology` and `infrastructure` plugin-roots. Producers are correct; the bug lives in the consumer.

## 4. Prior art in the codebase

- **Reused** — `packages/features/notebook/src/components/notebook-ui.tsx:194-301`. The notebook cell already implements the canonical dnd-kit pattern using `setActivatorNodeRef` to scope the drag activator to a small handle while keeping the rest of the cell clickable. This RFC lifts the same pattern verbatim.
- **Reused** — `packages/ui/src/hooks/use-debounced-value.ts`. `useDebouncedValue<T>(value, delayMs)` is the existing utility for "debounce one input value across renders". The host effect refactor in story 003 uses it directly.
- **Reused** — `packages/shell-contracts/src/tab-key.ts` `getTabKey()` and `tabKeyMatches()`. RFC 0028 only modifies the malformed-`tid` branch; the rest of the API is untouched.
- **Replaced** — none. RFC 0028 ships diffs, not new modules.
- **Orthogonal** — `packages/shell-contracts/src/tab-id.ts` legacy decoder paths (`nc:`, `np:`, `node:`, `topology:*`). The decoder is correct; the consumer's identity strategy is what changes.

## 5. Conceptual model

Three primitives, each with one user-visible failure mode:

1. **The tab as a clickable surface.** Today the entire button is both a click target and a drag activator. After this RFC, the click target stays the whole button; the drag activator is scoped to a 12-pixel grip element that only appears on hover (or is implicit on the pin icon for pinned tabs).
2. **The host effect as a URL-tab synchronizer.** Today one effect watches `location.href` and writes the entire tab list to `sessionStorage` on every change. After this RFC, the responsibility splits into three single-purpose effects — "ensure virtual tab exists", "ensure contextual tab exists", "track current href" — and the third one runs against a debounced href so that high-frequency URL changes from filter typing collapse into a single write.
3. **The tab key as identity.** Today malformed `tid` collapses onto `routeBase`. After this RFC, malformed `tid` produces `${routeBase}#invalid:${tid}` — a distinct identity that does not collide with the legitimate base tab. The encoder and the decoder are unchanged; only the `getTabKey` consumer's fallback rule changes.

## 6. Architecture overview

No layering changes. `packages/shell-contracts` still owns the identity protocol, `packages/ui` still owns the tab-bar component, `apps/web` still owns the host. The diffs are localized:

- `packages/shell-contracts/src/tab-key.ts` — fallback branch.
- `packages/ui/src/qlm/shell/project-shell-tab-bar.tsx` — DnD activator scope.
- `apps/web/src/shell/project-shell-host.tsx` — split effects + debounced href + click short-circuit.

No domain change, no port change, no schema change, no API change, no i18n change.

## 7. Security and trust boundaries

No auth surface, no PII, no secrets, no audit-event additions. Per `.claude/rules/security.md`, this section can stop here. Vanta evidence not affected.

## 8. UX surface and product integration

- New visual element: a leading 12-pixel `GripVertical` icon on every unpinned tab. Hidden by default; `opacity-50` on hover. Pinned tabs do not show the grip — the pin icon is the activator.
- No new copy; no i18n keys added.
- No change to keyboard shortcuts, no change to context menu, no change to middle-click close.

## 9. Operational considerations

- `pnpm typecheck` after each task. Already mandatory per `.claude/rules/commands.md`.
- Storybook entry for `project-shell-tab-bar` is mandatory per `.claude/rules/testing.md` §Storybook because the diff touches a `packages/ui/**` component.
- No telemetry change. No metrics or alerts to add.

## 10. Rollout plan

| Phase | Scope                                                                      | Artifacts                                       | Status |
| ----- | -------------------------------------------------------------------------- | ----------------------------------------------- | ------ |
| 1     | Fix bugs A, B, C, and cosmetic E. Three stories under one phase-1 spec.    | This RFC + `docs/specs/0028-…-phase1.md`        | Draft  |

No phase 2. The work that would justify a phase 2 (persistent panes, MRU, preview, sticky) is RFC 0027's territory.

## 11. Open questions

None. The three bugs are independent, the empirical tests in `packages/shell-contracts/src/tab-key.empirical.test.ts` already pin the deterministic surface area, and the UX choice for bug A (grip handle on hover) was confirmed by the user during planning.

## 12. Alternatives considered

- **Bumping `PointerSensor` distance from 5px to 12px with a 150ms delay.** Rejected. Wider distance still drops clicks in the trackpad-drift baseline, and a 150ms delay creates a perceivable lag on legitimate clicks. The activator-scope fix has neither cost.
- **Removing drag-to-reorder entirely and relying on the context-menu Move Left/Right.** Rejected. Drag-to-reorder is the primary affordance; removing it for the sake of a bug fix is a regression.
- **Having `getTabKey` return `null` for malformed `tid` and forcing the route to redirect.** Rejected. Wider blast radius (every consumer gets a null branch), and silently rewriting the URL hides the malformed state from the user. The sentinel form preserves the broken URL on its own visible tab.
- **Folding bugs A/B/C into RFC 0027 phase 1 as preamble work.** Rejected. RFC 0027's phase 1 is a model+controller+view rewrite. Wedging three independent bug fixes into it delays user-visible relief and complicates review. RFC 0028 lands first and stands alone.

## 13. References

- `.claude/rules/spec-driven-dev.md`
- `.claude/rules/clean-code.md`
- `.claude/rules/testing.md`
- `.claude/rules/validation.md`
- `.claude/rules/security.md`
- `docs/rfcs/0027-vscode-style-tab-system.md`
- `packages/shell-contracts/src/tab-key.empirical.test.ts` — empirical bug probes that this RFC converts into regression assertions.
