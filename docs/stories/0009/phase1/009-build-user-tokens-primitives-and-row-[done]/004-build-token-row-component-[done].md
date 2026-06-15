---
story: ./story.md
status: pending
layer: features
files:
  - packages/features/user-tokens/src/components/token-row.tsx
  - packages/features/user-tokens/src/components/token-row.stories.tsx
  - packages/features/user-tokens/__tests__/token-row.test.tsx
  - packages/features/user-tokens/src/components/index.ts
---

# Build TokenRow component

## Purpose

The 7-column row composed by Story 010's `TokenListView`. Renders a single `UserToken` end-to-end and emits a `onRevokeClick(token)` callback for the trash-icon button.

## Files

- `packages/features/user-tokens/src/components/token-row.tsx`:
  - Props: `{ token: UserToken; onRevokeClick: (token: UserToken) => void; }`. `Readonly<Props>`.
  - Wraps a `<tr>` with 7 `<td>` children matching spec §3.2.1:
    1. Name → `token.token_name`.
    2. Expires → `format(new Date(token.expires_at * 1000), 'PP')` via `date-fns/format`.
    3. Status → `<StatusChip status={deriveUserTokenStatus(token)} />`.
    4. Created At → same date formatter, parsing `token.created_at` (ISO string).
    5. Revoked At → date formatter on `token.revoked_at` if non-null else `t('tokens:table.notApplicable')`.
    6. Scopes → `[...token.scopes].sort(SCOPE_ORDER).map(scope => <ScopePill key={scope} scope={scope} />)` wrapped in a flex row. The sort enforces canonical `read / write / admin` order regardless of DB row order.
    7. Actions → `@guepard/ui/button` with `variant="ghost"` + `size="icon"` + `Trash2` lucide icon. Disabled when `deriveUserTokenStatus(token) !== 'active'`. `aria-label={t('tokens:table.revokeAriaLabel')}`. `onClick={() => onRevokeClick(token)}`.
- `packages/features/user-tokens/src/components/token-row.stories.tsx`:
  - `meta.title = 'UserTokens/TokenRow'`. Wrap each row in a `<table><tbody>` shell so the `<tr>` renders correctly.
  - Stories: `ActiveAllScopes`, `ActiveReadOnly`, `ActiveWriteAndAdmin`, `Expired`, `Revoked`.
- `packages/features/user-tokens/__tests__/token-row.test.tsx`:
  - Active token renders all 7 cells and the revoke button is enabled.
  - Expired token: revoke button is disabled.
  - Revoked token: revoke button is disabled, Revoked At cell shows the formatted date.
  - Active token: clicking revoke calls `onRevokeClick(token)` exactly once with the same token.
  - Multiple scopes (e.g. `['admin', 'read', 'write']` in DB order) render in the canonical `read / write / admin` order.
- `packages/features/user-tokens/src/components/index.ts` — extend with `TokenRow`.

## Acceptance

- [ ] `pnpm --filter @guepard/user-tokens typecheck` passes.
- [ ] `pnpm --filter @guepard/user-tokens test` passes.
- [ ] `Readonly<Props>` on the component.
- [ ] No hardcoded English; date formatting goes through `date-fns/format` with a locale-agnostic pattern (`'PP'`).
- [ ] Revoke button has the right `aria-label` and is correctly disabled for non-active tokens.

## Test plan

```
pnpm --filter @guepard/user-tokens typecheck
pnpm --filter @guepard/user-tokens test
```

## Storybook validation

- **Command**: `pnpm --filter @guepard/storybook-config storybook`
- **Story titles to inspect**: `UserTokens / Token Row / Active All Scopes`, `… / Active Read Only`, `… / Active Write And Admin`, `… / Expired`, `… / Revoked`
- **Expected visual outcome**: 5 row variants showing the 7 columns side-by-side in a small table. Active rows: trash icon button at the right is enabled. Expired and Revoked rows: trash icon is disabled (greyed out). Scope pills always appear in `read → write → admin` order regardless of DB array order.

## Notes

- `'PP'` from `date-fns` formats as e.g. `Apr 16, 2026` — locale-aware.
- The `SCOPE_ORDER` sort is the only place this canonical ordering is enforced; pulling it from `UserTokenScopeSchema.options` would couple the row to the schema's emit order — explicit local constant is the safer choice.
- The `<tr>` shape requires a `<table><tbody>` wrapper in stories so the native browser table rendering kicks in.
