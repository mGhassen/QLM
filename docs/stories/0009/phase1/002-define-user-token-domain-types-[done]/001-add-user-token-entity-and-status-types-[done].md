---
story: ./story.md
status: done
layer: domain
files:
  - packages/domain/src/entities/user-token-scope.ts
  - packages/domain/src/entities/user-token-status.ts
  - packages/domain/src/entities/user-token.type.ts
  - packages/domain/src/entities/index.ts
---

# Add user-token entity and status types

## Purpose

Ship the core type surface for a user token: the `UserTokenScope` enum, the view-only `UserTokenStatus` type + `deriveUserTokenStatus(...)` helper, and the `UserTokenSchema` + `UserTokenEntity` class that mirror `public.user_tokens` exactly.

## Files

- `packages/domain/src/entities/user-token-scope.ts` — `UserTokenScopeSchema = z.enum(['read','write','admin'])` + inferred `UserTokenScope` type.
- `packages/domain/src/entities/user-token-status.ts` — **view-only** union `UserTokenStatus = 'active' | 'expired' | 'revoked'` + pure `deriveUserTokenStatus({ revoked, expires_at, nowUnix? }): UserTokenStatus`. Inline comment makes it explicit this is NOT a column on `public.user_tokens`; phase 1 derives it at render time, RFC 0004 computes it server-side when live data lands.
- `packages/domain/src/entities/user-token.type.ts` — `UserTokenSchema` Zod object matching the landed table exactly (per spec §5.1): `id` uuid, `account_id` uuid, `token_name` string 1–255, `scopes` array of `UserTokenScope`, `expires_at` positive integer (Unix seconds, `bigint` in DB), `revoked` boolean with `.nullable().transform(v => v ?? false)` (handles the unhardened DB column per spec §1 Q5), `revoked_at` datetime nullable, `created_at`/`updated_at`/`created_by`/`updated_by` nullable. Plus a `UserTokenEntity` class following the existing pattern (`@Exclude()` class with `@Expose()` fields, `plainToClass`-friendly, no `create`/`update` factories needed in phase 1 because services drive creation directly).
- `packages/domain/src/entities/index.ts` — re-export `UserTokenScopeSchema`, `UserTokenScope`, `UserTokenStatus`, `deriveUserTokenStatus`, `UserTokenSchema`, `UserToken`, `UserTokenEntity`.

## Acceptance

- [ ] `UserTokenScopeSchema.parse('read'|'write'|'admin')` succeeds; any other value fails.
- [ ] `UserTokenSchema.parse({ ..., revoked: null })` succeeds and yields `revoked: false` via the `.transform`.
- [ ] `UserTokenSchema.parse({ ..., revoked: true })` and `.parse({ ..., revoked: false })` both succeed.
- [ ] `UserTokenSchema` uses the EXACT column names from `public.user_tokens` (`account_id`, `token_name`, `expires_at`, `revoked_at`, etc.) — no camelCase renames, no extra fields. Per spec §5.1 "Schema alignment — no drift".
- [ ] `deriveUserTokenStatus({ revoked: true, expires_at: <future> })` returns `'revoked'`.
- [ ] `deriveUserTokenStatus({ revoked: false, expires_at: <past> })` returns `'expired'`.
- [ ] `deriveUserTokenStatus({ revoked: false, expires_at: <future> })` returns `'active'`.
- [ ] `deriveUserTokenStatus` accepts an optional `nowUnix` arg for deterministic testing.
- [ ] `UserTokenEntity` is decorated such that `plainToClass(UserTokenEntity, row)` round-trips every field (following `DatasourceEntity` as the reference).
- [ ] `pnpm --filter @qlm/domain typecheck` passes.
- [ ] No imports of `jsonwebtoken`, `@supabase/*`, or `react` inside any new file.

## Test plan

```
pnpm --filter @qlm/domain typecheck
# No runtime tests in this task — they ship in task 004 of this story.
```

## Storybook validation

N/A — not a UI task.

## Notes

- Reference `packages/domain/src/entities/datasource.type.ts` for the entity-class pattern (imports, `@Exclude()`, `@Expose()`, `declare`d `id`).
- `deriveUserTokenStatus` is a pure function — put it in the same file as the `UserTokenStatus` type, not a separate `helpers/` location.
- If the `@Type(() => Date)` decorator is tempting on `created_at` / `updated_at`, don't use it here — the column is `timestamp with time zone` which serialises as ISO string; the Zod schema uses `z.string().datetime().nullable()`.
