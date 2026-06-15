---
story: ./story.md
status: pending
layer: features
files:
  - packages/features/user-tokens/src/components/token-list-view.tsx
  - packages/features/user-tokens/src/components/token-list-view.stories.tsx
  - packages/features/user-tokens/__tests__/token-list-view.test.tsx
  - packages/features/user-tokens/src/components/tokens-settings-pane.tsx
  - packages/features/user-tokens/src/components/index.ts
---

# Build TokenListView (list pane state)

## Purpose

The "list" pane state — header + toolbar (search input, status `<FilterPopover>`, scopes `<FilterPopover>`, Generate Token button) + table composing `<TokenRow>` from Story 009. Handles loading / empty / error.

## Files

- `src/components/token-list-view.tsx`:
  - Props: `Readonly<{ onGenerateClick: () => void; onRevokeClick: (token: UserToken) => void; }>`. Both callbacks dispatch into the parent reducer.
  - Reads via `useUserTokensQuery()`. States:
    - `isLoading` → loading skeleton (3 placeholder rows).
    - `error` → error block: `tokens:errors.listHeading` heading + `tokens:errors.generic` body + Retry button (calls `refetch`).
    - `data.length === 0` → empty block: `tokens:empty.heading` + `tokens:empty.body` + `tokens:empty.action` button (also fires `onGenerateClick`).
    - Otherwise → header (`tokens:page.title` + `tokens:page.subtitle`), toolbar, `<table>` rendering one `<TokenRow>` per filtered/searched row.
  - Local state: `search: string`, `statusFilter: UserTokenStatus[]`, `scopesFilter: UserTokenScope[]`. Filter logic is purely client-side over `data`.
- `src/components/token-list-view.stories.tsx`:
  - `Loading`, `Empty`, `Error`, `WithThreeTokens` (mix of active / expired / revoked statuses), `WithFilters` (initial filters set so empty result + reset chip visible).
- `__tests__/token-list-view.test.tsx`:
  - Loading / error / empty branches each render the right copy + retry/generate CTA.
  - Status filter narrows visible rows.
  - Scopes filter is OR-semantic across selected scopes (a row matches if it has any of the selected scopes).
  - Search filters by `token_name` (case-insensitive substring match).
  - Clicking the Generate Token button fires `onGenerateClick` once.
  - Clicking the trash icon on an active row fires `onRevokeClick(token)` once with the right token.
- `src/components/tokens-settings-pane.tsx` — replace the task-001 list-state placeholder with `<TokenListView onGenerateClick={() => dispatch({ type: 'open-create' })} onRevokeClick={(token) => dispatch({ type: 'open-revoke-confirm', token })} />`.
- `src/components/index.ts` — extend with `TokenListView`.

## Acceptance

- [ ] `pnpm --filter @qlm/user-tokens typecheck` + `test` both pass.
- [ ] No hardcoded English; all copy goes through `tokens:*` keys.
- [ ] `Readonly<Props>` on the component.
- [ ] Filter logic is pure client-side (no extra round-trip).
- [ ] Tests provide the `UserTokensApi` via the existing `UserTokensApiProvider` from Story 008.

## Test plan

```
pnpm --filter @qlm/user-tokens typecheck
pnpm --filter @qlm/user-tokens test
```

## Storybook validation

- **Command**: `pnpm --filter @qlm/storybook-config storybook`
- **Story titles**: `UserTokens / TokenListView / Loading`, `… / Empty`, `… / Error`, `… / With Three Tokens`, `… / With Filters`
- **Expected visual outcome**: `Loading` shows 3 grey skeleton rows. `Empty` shows centered "No access tokens yet" message + "Generate your first token" button. `Error` shows alert banner + Retry. `With Three Tokens` shows the toolbar + 3 rows (active green, expired muted, revoked red — trash button enabled on active, disabled on others).

## Notes

- The list view stays "logic-light" — it owns local search/filter state but offloads transitions to the parent.
- Skeleton rows are simple `bg-muted` divs, no need for `<Skeleton>` from `@qlm/ui` unless the existing component is already imported elsewhere in the package.
- The Generate Token button copy comes from `tokens:toolbar.generate` and the empty-state CTA from `tokens:empty.action` — they're intentionally different strings.
