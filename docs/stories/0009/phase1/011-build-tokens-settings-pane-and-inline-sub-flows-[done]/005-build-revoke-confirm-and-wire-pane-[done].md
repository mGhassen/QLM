---
story: ./story.md
status: pending
layer: features
files:
  - packages/features/user-tokens/src/components/revoke-confirm-inline.tsx
  - packages/features/user-tokens/src/components/revoke-confirm-inline.stories.tsx
  - packages/features/user-tokens/__tests__/revoke-confirm-inline.test.tsx
  - packages/features/user-tokens/src/components/tokens-settings-pane.tsx
  - packages/features/user-tokens/src/components/index.ts
  - apps/web/src/components/settings-dialog-mount.tsx
---

# Build RevokeConfirmInline + wire TokensSettingsPane into SettingsDialogMount

## Purpose

Final pane state — an *inline* (NOT Radix `Dialog`) confirmation block per AM-1's "no nested dialogs" rule. Then the host-app wiring step that swaps the Story-010 `<TokensPanePlaceholder />` for the real `<TokensSettingsPane />`.

## Files

- `src/components/revoke-confirm-inline.tsx`:
  - Props: `Readonly<{ token: UserToken; onCancel: () => void; onRevoked: (row: UserToken) => void; }>`.
  - Layout: a centered card with `role="alertdialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby` on the heading + body. Background dimmer overlay also rendered (NOT a Radix Portal — just an absolutely-positioned `<div>` inside the pane).
  - Heading `tokens:pane.revoke.heading`, body `tokens:pane.revoke.body`, footer with Cancel + Revoke buttons (`tokens:pane.revoke.cancel`, `tokens:pane.revoke.confirm`).
  - Revoke button uses `useRevokeUserTokenMutation`. While in flight, button shows spinner + `disabled`. On success: emits `onRevoked(row)` (which the parent reducer maps to `revoked → list`) AND fires a sonner toast `tokens:pane.revoke.toastSuccess`.
- `src/components/revoke-confirm-inline.stories.tsx`:
  - `Pristine`, `Submitting`, `Error` (mock the mutation rejecting).
- `__tests__/revoke-confirm-inline.test.tsx`:
  - The container uses `role="alertdialog"` + `aria-modal="true"`.
  - There is NO `@radix-ui/react-dialog` import in this file.
  - Cancel calls `onCancel`.
  - Revoke calls the mutation with `{ id: token.id }`; on success calls `onRevoked(updatedRow)`.
  - On mutation error: button re-enables, an inline error message appears, `onRevoked` is NOT called.
- `src/components/tokens-settings-pane.tsx` — replace task-001 revoke-confirm placeholder with `<RevokeConfirmInline token={state.token} onCancel={() => dispatch({ type: 'cancel-revoke-confirm' })} onRevoked={(row) => dispatch({ type: 'revoked', row })} />`.
- `src/components/index.ts` — extend with `RevokeConfirmInline`.
- `apps/web/src/components/settings-dialog-mount.tsx`:
  - Replace `<TokensPanePlaceholder />` with `<TokensSettingsPane />` (import from `@qlm/user-tokens/components`).
  - Wrap the children of `SettingsDialogContext.Provider` (or the dialog content) with `<UserTokensApiProvider value={...}>` from `@qlm/user-tokens/hooks`. The value adapts the existing `repositories.userToken` (`HttpUserTokenRepository`) to the `UserTokensApi` shape from Story 008. Three thin methods:
    - `list()` → `repositories.userToken.findByAccountId('')` (empty accountId — server resolves from session).
    - `create(input)` → `(repositories.userToken as HttpUserTokenRepository).createAndIssueJwt({ account_id: '', ...input })`.
    - `revoke(id)` → `repositories.userToken.revoke(id, '').then(row => row!)` (the adapter never returns null on the happy path; throw if it does).
  - Remove the `<TokensPanePlaceholder />` component definition entirely (no more dead code).

## Acceptance

- [ ] No `@qlm/ui/dialog` import in `revoke-confirm-inline.tsx`. The container uses a plain `<div>` with the right ARIA attributes.
- [ ] `pnpm --filter @qlm/user-tokens typecheck` + `test` pass.
- [ ] `pnpm --filter web typecheck` passes after the wiring change.
- [ ] `Readonly<Props>` on the component.
- [ ] All copy localized via `tokens:pane.revoke.*` keys.
- [ ] `<TokensSettingsPane />` is the actual pane content — opening the dialog from the account menu shows the list state with real data (or the empty placeholder when no tokens exist).
- [ ] `UserTokensApiProvider` is wired exactly once in `settings-dialog-mount.tsx`.

## Test plan

```
pnpm --filter @qlm/user-tokens typecheck
pnpm --filter @qlm/user-tokens test
pnpm --filter web typecheck
pnpm web:dev
# Manual: open Settings → click Generate → fill form → submit → reveal pane shows JWT → close → row appears in list → click trash → confirm-inline appears (NOT a stacked dialog) → Revoke → row flips to Revoked.
```

## Storybook validation

- **Command**: `pnpm --filter @qlm/storybook-config storybook`
- **Story titles**: `UserTokens / RevokeConfirmInline / Pristine`, `… / Submitting`, `… / Error`. PLUS the existing `UserTokens / TokensSettingsPane / Opened Revoke Confirm` (from task 001) now rendering the real component.
- **Expected visual outcome**: a centered confirmation card with subtle backdrop dim. Heading "Revoke this token?" + body warning. Cancel + Revoke buttons. `Submitting` shows a spinner on the Revoke button. `Error` shows an inline error message under the body.

## Notes

- The "inline modal" pattern: a centered absolutely-positioned card with a backdrop dim, but NO portal. It renders inside the same `<section>` the parent uses for the active pane state. Per AM-1, we deliberately stay shallow to avoid the nested-dialog focus-trap problems.
- Sonner toast on success means the user gets a small confirmation even if the list re-renders behind the dialog while they're still on screen.
- The `UserTokensApiProvider` adapter object is created via `useMemo` keyed on `repositories.userToken` so it's stable across renders.
