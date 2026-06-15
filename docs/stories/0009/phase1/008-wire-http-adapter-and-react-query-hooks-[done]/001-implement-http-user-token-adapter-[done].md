---
story: ./story.md
status: pending
layer: adapter
files:
  - apps/web/src/lib/repositories/user-token.repository.ts
  - apps/web/src/lib/repositories/index.ts
  - apps/web/src/lib/repositories-factory.ts
---

# Implement HTTP user-token adapter

## Purpose

Build `HttpUserTokenRepository` that calls the Story-006 server endpoints, and wire it into the browser-side `repositories-factory.ts` so React components can resolve `Repositories.userToken` via the existing workspace context.

## Files

- `apps/web/src/lib/repositories/user-token.repository.ts` — `HttpUserTokenRepository extends IUserTokenRepository`:
  - `findByAccountId(_accountId)` → `apiGet<UserToken[]>('/user-tokens', false)`. The `_accountId` argument is intentionally ignored — the server derives account from the session cookie. Documented inline.
  - `findById(id)` → throws "not supported" (no `/user-tokens/:id` GET in phase 1).
  - `create({ token_name, scopes, expires_at })` → `apiPost<CreateUserTokenOutput>('/user-tokens', { token_name, scopes, expires_at })`. Drops `account_id` before sending — the server overrides from session.
  - `revoke(id, _accountId)` → `apiPost<UserToken>('/user-tokens/${id}/revoke', {})`.
  - `findAll` / `findBySlug` / `update` / `delete` → throw "not supported" (mirror the supabase adapter).
- `apps/web/src/lib/repositories/index.ts` — re-export `HttpUserTokenRepository`.
- `apps/web/src/lib/repositories-factory.ts` — add `userToken: new HttpUserTokenRepository()` to the returned object. The browser-side `Repositories` already keeps the existing `as unknown as Repositories` cast for `jwtSigner` (the browser does not sign JWTs — the server is sole signer). Document this in a code comment.

## Acceptance

- [ ] `HttpUserTokenRepository` extends `IUserTokenRepository` from `@qlm/domain/repositories`.
- [ ] `create` does NOT send `account_id` over the wire (verified by reading the request payload in a unit test).
- [ ] `revoke(id, _)` issues `POST /user-tokens/${id}/revoke` with an empty JSON body.
- [ ] `repositories-factory.ts` includes `userToken: new HttpUserTokenRepository()` and a comment explaining why `jwtSigner` is intentionally absent on the browser side.
- [ ] `pnpm --filter web typecheck` passes.

## Test plan

```
pnpm --filter web typecheck
```

## Storybook validation

N/A — pure HTTP adapter; no rendered surface.

## Notes

- Pattern mirrors `apps/web/src/lib/repositories/notebook.repository.ts` — same `apiGet` / `apiPost` helpers, same constructor-less class.
- `CreateUserTokenOutput` from `@qlm/domain/usecases` includes `{ row, rawJwt }` — the adapter returns it as-is so the calling hook can plumb `rawJwt` into the reveal-once pane.
- The shape mismatch with the base port (`create(entity: T)` vs `create(input: CreateUserTokenRow)`) is the same one already absorbed by the Story-005 supabase adapter — TS compatibility holds because the derived `IUserTokenRepository.create` overrides the base abstract method.
