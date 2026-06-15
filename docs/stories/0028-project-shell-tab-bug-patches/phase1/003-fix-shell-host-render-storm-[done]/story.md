---
spec: docs/specs/0028-project-shell-tab-bug-patches-phase1.md
spec_sections:
  - "#3-3-user-flows-happy-paths"
  - "#3-4-error-and-edge-case-behaviour"
status: pending
started: null
finished: null
blocks: []
blocked_by: []
---

# Fix shell-host render storm and idle-click navigate

## Goal

Typing into a list-page filter does not write to `sessionStorage` per keystroke and does not recompute the tab-bar memo per keystroke. Clicking the already-active tab is a no-op.

## Scope

**In scope**
- `apps/web/src/shell/project-shell-host.tsx` — split the 90-line `useEffect` into three single-purpose effects, debounce the href-tracking effect with `useDebouncedValue`, short-circuit `handleTabClick` on the active tab id.

**Out of scope**
- `<Root key={tabKey} />` keyed remount (RFC 0027 phase 1 owns it).
- Persisting tab state across browser sessions beyond what `sessionStorage` already does.
- Any change to flat-route or agent-route consumers (`apps/web/src/routes/$flatPrefix.$.tsx`, `apps/web/src/routes/agent/$conversationSlug.tsx`).

## Acceptance criteria

- [ ] Typing 20 characters into a filter input on `/prj/<slug>/infrastructure` produces ≤2 `sessionStorage.setItem` writes (debounced flush + any membership change).
- [ ] No `setOpenTabs` call fires per keystroke once the filter is steady-state and no tabs are being added or removed.
- [ ] `handleTabClick(activeTabId)` does not call `navigate`.
- [ ] Filter / search / sort / pagination state still survives a tab switch and switch-back round trip (the debounced href converges to the latest URL within 150 ms of the last keystroke).
- [ ] `pnpm typecheck` is green.
- [ ] Manual `ui-smoke` against `/prj/$projectSlug/infrastructure` reports `expect_console: empty`.

## Tasks

1. [001-split-sync-effect-and-debounce-href-tracking](001-split-sync-effect-and-debounce-href-tracking-[pending].md)
2. [002-short-circuit-handleTabClick-on-active-tab](002-short-circuit-handleTabClick-on-active-tab-[pending].md)

## Demo / verification

1. `pnpm dev` → DevTools → Performance → record. Type 20 chars into the filter input on `/prj/<slug>/infrastructure`. Stop. Confirm ≤2 sessionStorage writes and no per-keystroke storyline of `setOpenTabs`.
2. Click the active tab repeatedly — no navigate, no flicker, no console noise.
3. Click an inactive tab. Filter state restores correctly.

## Questions surfaced

- 

## Spec-accuracy check

- [ ] The referenced spec sections still match the implementation as shipped.
