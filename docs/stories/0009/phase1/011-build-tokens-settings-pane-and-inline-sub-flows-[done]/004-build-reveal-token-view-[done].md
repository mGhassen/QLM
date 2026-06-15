---
story: ./story.md
status: pending
layer: features
files:
  - packages/features/user-tokens/src/components/reveal-token-view.tsx
  - packages/features/user-tokens/src/components/reveal-token-view.stories.tsx
  - packages/features/user-tokens/__tests__/reveal-token-view.test.tsx
  - packages/features/user-tokens/src/components/tokens-settings-pane.tsx
  - packages/features/user-tokens/src/components/index.ts
---

# Build RevealTokenView (reveal pane state)

## Purpose

One-time JWT reveal — the only place in the entire app where `rawJwt` is shown to the user. Closing returns the pane to `list` and drops `rawJwt` from parent state (already enforced by the reducer in task 001).

## Files

- `src/components/reveal-token-view.tsx`:
  - Props: `Readonly<{ row: UserToken; rawJwt: string; onClose: () => void; }>`.
  - Layout:
    - Heading `tokens:pane.reveal.heading`.
    - Warning banner (yellow): `tokens:pane.reveal.warning`.
    - JWT field — read-only `<input>` filled with `rawJwt`, monospace font, with a Copy button (`tokens:pane.reveal.copyJwt`). Copy button uses `navigator.clipboard.writeText(rawJwt)`. After copy: button label flips to `tokens:pane.reveal.copied` for 2 s, then back to the copy label.
    - curl snippet field — multiline `<pre>` with `curl -H "Authorization: Bearer <jwt>" <publicApiUrl>/health` (or similar — see notes for canonical example) with another Copy button. `publicApiUrl` resolves from `import.meta.env.VITE_QLM_PUBLIC_API_URL` with a sensible fallback (`https://api.qlm.run`).
    - Close button (`tokens:pane.reveal.close`) — fires `onClose`.
- `src/components/reveal-token-view.stories.tsx`:
  - `Initial`, `Copied` (mock the post-copy state), `LongJwt` (verify the readonly input handles a long token without breaking layout).
- `__tests__/reveal-token-view.test.tsx`:
  - Renders the warning + the JWT in the readonly input + the curl snippet with the JWT inlined.
  - Copy JWT button calls `navigator.clipboard.writeText(rawJwt)` (mocked).
  - Copy curl button copies the curl snippet text (with JWT + URL substituted).
  - Close button fires `onClose`.
  - The component never renders `rawJwt` in any non-readable element (no `data-test="raw-jwt"` attribute exposing it for screenshots).
- `src/components/tokens-settings-pane.tsx` — replace task-001 reveal-state placeholder with `<RevealTokenView row={state.row} rawJwt={state.rawJwt} onClose={() => dispatch({ type: 'close-reveal' })} />`.
- `src/components/index.ts` — extend with `RevealTokenView`.

## Acceptance

- [ ] No `Dialog` import.
- [ ] `pnpm --filter @qlm/user-tokens typecheck` + `test` pass.
- [ ] `Readonly<Props>` on the component.
- [ ] All copy localized via `tokens:pane.reveal.*` keys.
- [ ] Closing fires `onClose` exactly once.
- [ ] `rawJwt` never appears in `localStorage` / `sessionStorage` / a callback after close — the parent reducer's `close-reveal` action drops it.

## Test plan

```
pnpm --filter @qlm/user-tokens typecheck
pnpm --filter @qlm/user-tokens test
```

## Storybook validation

- **Command**: `pnpm --filter @qlm/storybook-config storybook`
- **Story titles**: `UserTokens / RevealTokenView / Initial`, `… / Copied`, `… / Long Jwt`
- **Expected visual outcome**: yellow warning banner at top, readonly monospace input with the JWT, multiline `<pre>` with the curl example, primary Close button at the bottom. Copy buttons swap label briefly when clicked.

## Notes

- `navigator.clipboard.writeText` is the only browser API call in the component; mock it in tests via `Object.defineProperty(navigator, 'clipboard', { ... })` before rendering.
- Curl example shape: `curl -H "Authorization: Bearer ${jwt}" ${url}/health`. The URL ending in `/health` is intentional — the simplest endpoint to validate the token works.
- Phase 2 may add a "test the token" inline button — out of scope.
