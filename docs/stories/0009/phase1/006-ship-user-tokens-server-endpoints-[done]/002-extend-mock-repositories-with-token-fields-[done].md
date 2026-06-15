---
story: ./story.md
status: pending
layer: tests
files:
  - apps/server/__tests__/helpers/mock-repositories.ts
---

# Extend mock repositories with token fields

## Purpose

Add `userToken` (in-memory map per accountId) and `jwtSigner` (deterministic stub) to `createMockRepositories()` so the route tests can exercise the new endpoints without touching the real Supabase wiring.

## Files

- `apps/server/__tests__/helpers/mock-repositories.ts`:
  - Add a `userTokenStore` keyed by `id`, plus an account-id index for `findByAccountId`.
  - `userToken`:
    - `findByAccountId(accountId)` → rows with that `account_id`, sorted `created_at DESC`.
    - `findById(id)` → the row or `null`.
    - `findAll` / `findBySlug` / `update` / `delete` → throw the documented "not supported" errors (mirroring the real adapter).
    - `create({ account_id, token_name, scopes, expires_at })` → assigns `id = crypto.randomUUID()`, `revoked = false`, `revoked_at = null`, `created_at`/`updated_at` to current ISO, `created_by`/`updated_by = account_id`.
    - `revoke(id, accountId)` → sets `revoked = true` + `revoked_at = now()`, returns the updated row; returns `null` when row missing OR already revoked.
  - `jwtSigner.sign(payload, options)` → returns a deterministic `mock.jwt.<token_id>` string so test assertions can spot-check it without verifying real HS256.
  - Also wire the previously-missing fields the type `Repositories` requires (`orderItem`, `userQuota`, `volumePricingTier`) using `stubRepo(...)` — this is what makes the helper's return value satisfy the type without `as unknown as`.

## Acceptance

- [ ] `createMockRepositories()` returns an object that satisfies the `Repositories` type with no casts.
- [ ] `mockRepos.userToken.create({...})` round-trips through `findByAccountId` and `findById`.
- [ ] `mockRepos.userToken.revoke(id, accountId)` returns the updated row first call, `null` on the second.
- [ ] `mockRepos.jwtSigner.sign({...}, {...})` returns `'mock.jwt.<token_id>'`.
- [ ] `pnpm --filter server typecheck` passes.

## Test plan

```
pnpm --filter server typecheck
```

## Storybook validation

N/A — not a UI task.

## Notes

- `crypto.randomUUID()` produces a v4 UUID that satisfies `UserTokenSchema.parse(...)` — no need to hand-craft.
- This task is the first time the helper is fully type-aligned; downstream test files no longer need workaround casts.
