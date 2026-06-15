---
story: ./story.md
status: pending
layer: adapter
files:
  - packages/repositories/supabase/src/user-token.repository.ts
  - packages/repositories/supabase/src/index.ts
---

# Implement Supabase user-token repository

## Purpose

Implement `SupabaseUserTokenRepository extends IUserTokenRepository` backed by `public.user_tokens`, and export it from the `@qlm/repository-supabase` barrel.

## Files

- `packages/repositories/supabase/src/user-token.repository.ts` — concrete class:
  - `findByAccountId(accountId)` → `client.from('user_tokens').select('*').eq('account_id', accountId).order('created_at', { ascending: false })`. Returns parsed `UserToken[]` via `UserTokenSchema`.
  - `findById(id)` → single-row lookup, `PGRST116` → `null`, parse via `UserTokenSchema`.
  - `findAll()` → throws `Error('not supported — user tokens must be listed per account')` so a caller accidentally calling the base port's `findAll` fails loud instead of leaking cross-account rows.
  - `create({ account_id, token_name, scopes, expires_at })` → `INSERT INTO user_tokens(...) VALUES(...) RETURNING *`. Triggers fill timestamps + user-tracking.
  - `revoke(id, accountId)` → `UPDATE user_tokens SET revoked = true, revoked_at = now() WHERE id = $id AND account_id = $accountId AND revoked = false RETURNING *`. Zero rows → return `null`.
- `packages/repositories/supabase/src/index.ts` — re-export `SupabaseUserTokenRepository`.

## Acceptance

- [ ] Class extends `IUserTokenRepository` from `@qlm/domain/repositories` (abstract class, not a type).
- [ ] `findByAccountId` filters by `account_id` and orders by `created_at DESC`.
- [ ] `create` inserts only the four fields (`account_id`, `token_name`, `scopes`, `expires_at`) and returns the full row via `.select().single()`.
- [ ] `revoke` narrows `WHERE revoked = false`; returns `null` when zero rows are updated (both unknown id and already-revoked cases).
- [ ] Every returned row is validated through `UserTokenSchema.parse(...)` so a DB drift surfaces as a Zod error at the adapter boundary.
- [ ] `pnpm --filter @qlm/repository-supabase typecheck` passes.

## Test plan

```
pnpm --filter @qlm/repository-supabase typecheck
```

## Storybook validation

N/A — not a UI task.

## Notes

- Use `UserTokenSchema` from `@qlm/domain/entities` for parsing — it normalises `revoked: null → false`.
- Follow the constructor pattern `constructor(private client: SupabaseClientType) { super(); }` from `DatasourceRepository`.
- Do NOT hand-set `created_at` / `updated_at` / `created_by` / `updated_by` — the DB triggers own those.
