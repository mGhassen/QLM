---
story: ./story.md
status: pending
layer: features
files:
  - packages/features/user-tokens/src/components/tokens-settings-pane-state.ts
  - packages/features/user-tokens/src/components/tokens-settings-pane.tsx
  - packages/features/user-tokens/src/components/tokens-settings-pane.stories.tsx
  - packages/features/user-tokens/__tests__/tokens-settings-pane-state.test.ts
  - packages/features/user-tokens/__tests__/tokens-settings-pane.test.tsx
  - packages/features/user-tokens/src/components/index.ts
---

# Build pane-state reducer and TokensSettingsPane shell

## Purpose

`useReducer` state machine for the four pane states (per spec §3.2.6) plus the `<TokensSettingsPane>` shell that swaps between four child placeholders based on state. This task lays the skeleton — tasks 002–005 fill in the real child components.

## Files

- `src/components/tokens-settings-pane-state.ts`:
  - Discriminated union `PaneState`:
    - `{ kind: 'list' }`
    - `{ kind: 'create' }`
    - `{ kind: 'reveal'; row: UserToken; rawJwt: string }`
    - `{ kind: 'revoke-confirm'; token: UserToken }`
  - Action union `PaneAction`: `'open-create' | 'cancel-create' | 'created' | 'close-reveal' | 'open-revoke-confirm' | 'cancel-revoke-confirm' | 'revoked'`. Each carries any payload required by the matching state.
  - `paneReducer(state, action) → PaneState`. Invalid transitions throw — the state machine in spec §3.2.6 is strict on purpose (no `revoked → reveal` etc.).
  - Exported `INITIAL_PANE_STATE: PaneState = { kind: 'list' }`.
- `src/components/tokens-settings-pane.tsx`:
  - Props: `Readonly<{}>` (or `Readonly<{ accountId?: string }>` if needed downstream — keep zero props for phase 1).
  - Holds `useReducer(paneReducer, INITIAL_PANE_STATE)`.
  - For task 001 only: each pane state renders a `<div>` with `data-test="pane-state-<kind>"` and a small placeholder including the right transition buttons (so the reducer can be exercised end-to-end via Storybook even before tasks 002–005 fill in the real children).
  - Each subsequent task 002–005 swaps in the real child component while keeping the dispatch wiring identical.
- `src/components/tokens-settings-pane.stories.tsx`:
  - Stories: `Initial` (lands on `list` placeholder), `OpenedCreate` (initial action `open-create`), `OpenedReveal` (mock initial state directly), `OpenedRevokeConfirm` (mock initial state directly).
- `__tests__/tokens-settings-pane-state.test.ts`:
  - Exhaustive coverage of every legal transition + at least one illegal transition that throws.
- `__tests__/tokens-settings-pane.test.tsx`:
  - Renders the pane, asserts the `pane-state-list` data-test fires; clicks the placeholder "open create" button and asserts `pane-state-create` appears.
- `src/components/index.ts` — extend with `TokensSettingsPane` export.

## Acceptance

- [ ] `pnpm --filter @guepard/user-tokens typecheck` passes.
- [ ] `pnpm --filter @guepard/user-tokens test` passes (≥ 90 % coverage on the reducer, full transition matrix exercised).
- [ ] At any moment, exactly one of `pane-state-{list|create|reveal|revoke-confirm}` is in the DOM — verified by a test.
- [ ] Reveal-state holds `rawJwt`; the `close-reveal` action drops it (the next state is `list` with no `rawJwt` field) — verified by a reducer test.
- [ ] Storybook stories render each state without errors.

## Test plan

```
pnpm --filter @guepard/user-tokens typecheck
pnpm --filter @guepard/user-tokens test
```

## Storybook validation

- **Command**: `pnpm --filter @guepard/storybook-config storybook`
- **Story titles**: `UserTokens / TokensSettingsPane / Initial`, `… / Opened Create`, `… / Opened Reveal`, `… / Opened Revoke Confirm`
- **Expected visual outcome**: four placeholder boxes, each labelled with the pane-state name and equipped with the transition buttons (e.g. on the `Initial`/list state: a "Generate" button that swaps to the `OpenedCreate` placeholder).

## Notes

- The placeholder children are intentionally throwaway — they exist so the reducer is exercisable in Storybook without waiting for tasks 002–005. Each later task removes its placeholder by passing the real child component.
- The reducer is the single source of truth for "did the user just create a token?" — `rawJwt` lives only in `reveal` state, never in localStorage / sessionStorage / parent.
- Throwing on illegal transitions is the cheapest way to catch a regression where a child component dispatches the wrong action; tests cover the throw path.
