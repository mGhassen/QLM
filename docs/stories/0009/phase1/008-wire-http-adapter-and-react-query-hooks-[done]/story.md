---
spec: docs/specs/0009-token-management-phase1.md
spec_sections:
  - "#72-adapters-packagesrepositories-and-appswebsrclibrepositories"
  - "#42-component-split"
status: done
started: 2026-04-16
finished: 2026-04-16
blocks:
  - "011-build-tokens-settings-pane-and-inline-sub-flows"
blocked_by:
  - "002-define-user-token-domain-types"
  - "006-ship-user-tokens-server-endpoints"
---

# Wire HTTP adapter and React Query hooks

## Goal

Implement `HttpUserTokenRepository` against the Story-006 server endpoints, wire it into `apps/web/src/lib/repositories-factory.ts`, and publish the three TanStack Query hooks (`useUserTokensQuery`, `useCreateUserTokenMutation`, `useRevokeUserTokenMutation`) from `@guepard/user-tokens/hooks` — so every later UI story (010, 011) consumes them directly.

## Scope

**In scope**

- `apps/web/src/lib/repositories/user-token.repository.ts` — `HttpUserTokenRepository` implementing `IUserTokenRepository` from `@guepard/domain/repositories`:
  - `findByAccountId(_accountId)` → `apiGet('/user-tokens')` (account context is implicit in the session cookie — the server derives `accountId` from it, so the browser-side `accountId` arg is ignored; this is documented in a code comment).
  - `create({ account_id, token_name, scopes, expires_at })` → `apiPost('/user-tokens', { token_name, scopes, expires_at })` (server overrides `account_id` from the session, so the client doesn't send it).
  - `revoke(id, _accountId)` → `apiPost('/user-tokens/${id}/revoke')` (same session-implicit pattern).
  - Parse response bodies through the Zod schemas from Story 002 (`UserTokenSchema`, `CreateUserTokenOutputSchema`).
- Wire into `apps/web/src/lib/repositories-factory.ts` — add `userToken: new HttpUserTokenRepository(...)` to the returned `Repositories` object. (The browser side does NOT instantiate `JwtSigner` — signing is server-only.)
- `packages/features/user-tokens/src/hooks/use-user-tokens-query.ts` — TanStack Query hook:
  - `queryKey: ['user-tokens', 'list']`
  - `queryFn: () => repositories.userToken.findByAccountId(currentAccountId)`
  - Returns `{ data, isLoading, error, refetch }`.
- `packages/features/user-tokens/src/hooks/use-create-user-token-mutation.ts` — returns `{ mutateAsync, isPending, error }`. On success, calls `queryClient.invalidateQueries({ queryKey: ['user-tokens', 'list'] })`.
- `packages/features/user-tokens/src/hooks/use-revoke-user-token-mutation.ts` — same shape. Invalidates the list on success.
- Expose via `packages/features/user-tokens/src/hooks/index.ts` → re-export from the `./hooks` subpath defined in Story 001's `package.json`.
- Unit tests for each hook using `@testing-library/react` + a mocked `HttpUserTokenRepository`. Verify invalidation happens on success.

**Out of scope**

- Any component that consumes the hooks (→ Stories 010, 011).
- Server endpoints themselves (→ Story 006, blocker).
- The JWT signer (server-side only, covered by Story 005).

## Acceptance criteria

- [x] `HttpUserTokenRepository` extends `IUserTokenRepository` from `@guepard/domain`. Includes a non-port `createAndIssueJwt(...)` method that returns the full `{ row, rawJwt }` payload — port-shape mismatch documented in the spec Changelog.
- [x] Each method calls the corresponding path from spec §5.2 (`GET /api/user-tokens`, `POST /api/user-tokens`, `POST /api/user-tokens/:id/revoke`).
- [x] `apps/web/src/lib/repositories-factory.ts` AND `apps/web/src/lib/repositories/repositories-factory.ts` (the SSR-aware factory) both populate `userToken: new HttpUserTokenRepository()`.
- [x] `jwtSigner` slot: the SSR-aware factory binds it to the supabase package's `JwtSigner` to satisfy the type, but it is never invoked from the browser (documented in code comments). The simpler factory at `apps/web/src/lib/repositories-factory.ts` keeps its `as unknown as Repositories` cast.
- [x] Hooks read the API surface via the new lightweight `UserTokensApiProvider`/`useUserTokensApi` context (the canonical "deeper-than-shell" pattern; `useShell()` is project-scoped and user tokens are account-scoped) — see Changelog for the rationale deviation from the spec's "via workspace context" wording.
- [x] Both mutations invalidate `['user-tokens', 'list']` on success — directly verified by the per-hook test files.
- [x] All hooks (`useUserTokensQuery`, `useCreateUserTokenMutation`, `useRevokeUserTokenMutation`) plus the new `UserTokensApiProvider` / `useUserTokensApi` / `USER_TOKENS_LIST_QUERY_KEY` are re-exported from `@guepard/user-tokens/hooks`.
- [x] `pnpm --filter @guepard/user-tokens typecheck` and `pnpm --filter web typecheck` both pass.
- [x] `pnpm --filter @guepard/user-tokens test` passes (8 tests, 95 % line coverage on `src/hooks`).

## Tasks

1. [001-implement-http-user-token-adapter](001-implement-http-user-token-adapter-[pending].md) — adapter. `HttpUserTokenRepository` + factory wiring.
2. [002-implement-react-query-hooks](002-implement-react-query-hooks-[pending].md) — features. Three TanStack Query hooks under `packages/features/user-tokens/src/hooks/`.
3. [003-cover-hooks-with-tests](003-cover-hooks-with-tests-[pending].md) — tests. Per-hook test files asserting repo calls + post-success invalidation.

## Demo / verification

```bash
pnpm --filter @guepard/user-tokens typecheck
pnpm --filter @guepard/user-tokens test -- hooks

# Optional: wire the hook into a scratch component and run pnpm web:dev to observe XHR
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped, with two structural deviations logged in the spec Changelog: (a) the browser adapter exposes a non-port method `createAndIssueJwt(input): Promise<CreateUserTokenOutput>` so the create-mutation hook can plumb `rawJwt` to the reveal-once pane (the domain port's `create` returns just `UserToken` and can't carry the JWT). (b) The hooks read their dependencies from a new `UserTokensApiProvider` context inside the feature package rather than calling the workspace context the spec mentioned — `useShell()` is project-scoped and user tokens are account-scoped, so a bespoke context is the right shape.
