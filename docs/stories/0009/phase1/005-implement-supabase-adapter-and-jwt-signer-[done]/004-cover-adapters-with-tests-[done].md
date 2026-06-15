---
story: ./story.md
status: pending
layer: tests
files:
  - packages/repositories/supabase/__tests__/user-token.repository.test.ts
  - packages/repositories/supabase/__tests__/jwt-signer.test.ts
---

# Cover adapters with tests

## Purpose

Vitest coverage for `SupabaseUserTokenRepository` (SQL call shape + null-return branches) and `JwtSigner` (HS256 round-trip via real `jsonwebtoken`).

## Files

- `packages/repositories/supabase/__tests__/user-token.repository.test.ts`:
  - Build a mock chainable Supabase client — mirror whatever pattern the existing `*.repository.test.ts` files in this package already use (reuse, do NOT introduce a new style).
  - Cases:
    - `findByAccountId` calls `.from('user_tokens').select('*').eq('account_id', id).order('created_at', { ascending: false })` with the exact argument shape; returns parsed rows.
    - `findById` happy path + `PGRST116` → null.
    - `create` sends `{ account_id, token_name, scopes, expires_at }` in the insert payload (no timestamp / tracking fields); returns the inserted row parsed.
    - `revoke` happy path returns the updated row; zero-rows scenario returns `null`; the WHERE clause uses `id`, `account_id`, AND `revoked = false`.
    - `findAll()` throws the documented "not supported" error (no cross-account leak).
- `packages/repositories/supabase/__tests__/jwt-signer.test.ts`:
  - `sign({ token_id, sub, scopes, exp, aud, role }, { secret, algorithm: 'HS256' })` returns a non-empty string.
  - `jsonwebtoken.verify(token, secret, { algorithms: ['HS256'] })` round-trips to the same payload (excluding standard `iat` claim that `sign` adds).
  - `sign` with a different secret than `verify` throws.

## Acceptance

- [ ] Both test files run green via `pnpm --filter @guepard/repository-supabase test`.
- [ ] Coverage ≥ 90 % on `src/user-token.repository.ts` and `src/jwt-signer.ts`.
- [ ] Tests use the same mock-client pattern as existing repository tests in the package; no new test helper directory introduced.
- [ ] No real DB / network / third-party service calls.

## Test plan

```
pnpm --filter @guepard/repository-supabase test
pnpm --filter @guepard/repository-supabase exec vitest run --coverage --coverage.include='src/user-token.repository.ts' --coverage.include='src/jwt-signer.ts'
```

## Storybook validation

N/A — not a UI task.

## Notes

- If the existing repository tests in this package have sparse coverage, match that style rather than over-engineering — keep the bar "at or above existing neighbors."
- The JWT round-trip test gives us confidence that `guepard-public-api` (which verifies with the same secret) can read v3-issued tokens.
