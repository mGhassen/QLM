---
story: ./story.md
status: pending
layer: tests
files:
  - packages/features/user-tokens/__tests__/use-user-tokens-query.test.tsx
  - packages/features/user-tokens/__tests__/use-create-user-token-mutation.test.tsx
  - packages/features/user-tokens/__tests__/use-revoke-user-token-mutation.test.tsx
---

# Cover hooks with tests

## Purpose

Vitest + `@testing-library/react` coverage for each hook against a mocked `IUserTokenRepository`, asserting query/mutation behavior AND that mutations invalidate the list query on success.

## Files

- One file per hook under `packages/features/user-tokens/__tests__/`:
  - `use-user-tokens-query.test.tsx`: renders a probe component wrapped in a `QueryClientProvider` + the project-context provider with a stubbed `Repositories.userToken`. Asserts `repository.findByAccountId` is called and the rendered probe sees the rows.
  - `use-create-user-token-mutation.test.tsx`: triggers `mutateAsync(...)`, asserts the repository's `create` was called with `{ account_id: '', token_name, scopes, expires_at }`, and that `queryClient.invalidateQueries` was called with `['user-tokens', 'list']` on success.
  - `use-revoke-user-token-mutation.test.tsx`: same shape — asserts `repository.revoke(id, '')` and post-success invalidation.
- Shared in-file: a small `withProviders(children, repositories)` helper per file (or one helper if a single shared file emerges as the cleaner shape — judgment call during implementation).

## Acceptance

- [ ] All three test files run green via `pnpm --filter @qlm/user-tokens test`.
- [ ] Each mutation test directly verifies the post-success invalidation by spying on `queryClient.invalidateQueries`.
- [ ] No real network / Supabase / DOM hits beyond what `@testing-library/react`'s `jsdom` provides.
- [ ] Coverage ≥ 90 % on `src/hooks/*`.

## Test plan

```
pnpm --filter @qlm/user-tokens test
pnpm --filter @qlm/user-tokens exec vitest run --coverage --coverage.include='src/hooks/*'
```

## Storybook validation

N/A — testing pure data hooks; no rendered surface.

## Notes

- The in-file context-provider stub is the canonical pattern (see existing feature-package tests for shape). No new test-helper directory introduced.
- A spy-based invalidation assertion is enough — no need to also verify the next `useUserTokensQuery` re-fetches.
