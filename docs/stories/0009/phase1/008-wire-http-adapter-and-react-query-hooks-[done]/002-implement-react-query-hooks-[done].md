---
story: ./story.md
status: pending
layer: features
files:
  - packages/features/user-tokens/src/hooks/use-user-tokens-query.ts
  - packages/features/user-tokens/src/hooks/use-create-user-token-mutation.ts
  - packages/features/user-tokens/src/hooks/use-revoke-user-token-mutation.ts
  - packages/features/user-tokens/src/hooks/index.ts
  - packages/features/user-tokens/package.json
---

# Implement React Query hooks

## Purpose

Three TanStack Query hooks consumed by Stories 010 + 011 — one query for listing, two mutations for create + revoke, both invalidating the list query on success.

## Files

- `packages/features/user-tokens/src/hooks/use-user-tokens-query.ts` — `useUserTokensQuery()`:
  - `queryKey: ['user-tokens', 'list']`.
  - `queryFn: () => repositories.userToken.findByAccountId('')` — the empty `accountId` is the documented "ignored, server derives from session" pattern from Story 008 task 001.
  - Returns the standard React Query result `{ data, isLoading, error, refetch }`.
- `packages/features/user-tokens/src/hooks/use-create-user-token-mutation.ts` — `useCreateUserTokenMutation()`:
  - `mutationFn: (input: CreateUserTokenInput) => repositories.userToken.create({ account_id: '', ...input })`.
  - `onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-tokens', 'list'] })`.
- `packages/features/user-tokens/src/hooks/use-revoke-user-token-mutation.ts` — `useRevokeUserTokenMutation()`:
  - `mutationFn: ({ id }: { id: string }) => repositories.userToken.revoke(id, '')`.
  - `onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-tokens', 'list'] })`.
- `packages/features/user-tokens/src/hooks/index.ts` — re-export all three.
- `packages/features/user-tokens/package.json` — add deps that the hooks need at runtime: `@guepard/repository-supabase` is **not** added (would pull supabase into the browser bundle); the hook reads `Repositories` via the existing `useWorkspace()`/`useShell()` context (whichever the existing accounts/datasources features use). Add `@guepard/shell-runtime` if needed.

## Acceptance

- [ ] All three hooks live in `packages/features/user-tokens/src/hooks/` and are re-exported from `index.ts`.
- [ ] `useUserTokensQuery` uses `queryKey: ['user-tokens', 'list']`.
- [ ] Both mutations invalidate `['user-tokens', 'list']` on success.
- [ ] Hooks read `Repositories` via the existing project context — no direct adapter import.
- [ ] `pnpm --filter @guepard/user-tokens typecheck` passes.
- [ ] No `@guepard/repository-supabase` import inside `packages/features/user-tokens/src/`.

## Test plan

```
pnpm --filter @guepard/user-tokens typecheck
```

## Storybook validation

N/A — pure data hooks; no rendered surface.

## Notes

- Whichever existing feature already accesses `Repositories` from a hook (e.g. `packages/features/accounts`) is the canonical pattern — copy its access path verbatim.
- Mutation `onSuccess` invalidations are the only state-management pattern this story ships; optimistic updates are deferred to story 011 if needed.
