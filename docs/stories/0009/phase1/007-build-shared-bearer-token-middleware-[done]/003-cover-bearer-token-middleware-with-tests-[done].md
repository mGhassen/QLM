---
story: ./story.md
status: pending
layer: tests
files:
  - packages/auth-shared/__tests__/bearer-token-middleware.test.ts
---

# Cover bearer-token middleware with tests

## Purpose

Vitest suite that exercises every branch of `verifyBearerToken` (6 rejection + 1 happy = 7) and the full 12-cell `scopePermitsMethod` truth table, using `jsonwebtoken.sign` to mint real HS256 JWTs + an injected in-memory `lookup` fixture.

## Files

- `packages/auth-shared/__tests__/bearer-token-middleware.test.ts`:
  - Constants: `TEST_SECRET = 'test-secret'`, `NOW = Date.now()`, `FUTURE = Math.floor((NOW + 3600_000) / 1000)`, `PAST = Math.floor((NOW - 3600_000) / 1000)`.
  - Helper `signJwt(payload, secretOverride?)` → `jsonwebtoken.sign(payload, secretOverride ?? TEST_SECRET, { algorithm: 'HS256' })`.
  - Helper `lookup(map)` returns `(tokenId) => Promise<...>` backed by a `Map<string, { revoked; expires_at }>`.
  - Cases:
    1. `authHeader = null` → `no-auth`.
    2. `authHeader = 'Basic abc'` → `no-auth`.
    3. Signature mismatch (signed with a different secret) → `invalid-signature`.
    4. Invalid payload shape (missing `token_id`) → `invalid-signature`.
    5. Valid JWT + `lookup` returns `null` → `not-found`.
    6. Valid JWT + `lookup` returns `{ revoked: true, expires_at: FUTURE }` → `revoked`.
    7. Valid JWT + `lookup` returns `{ revoked: false, expires_at: PAST }` → `expired`.
    8. Happy path: `lookup` returns `{ revoked: false, expires_at: FUTURE }` → `{ ok: true, accountId, scopes }`.
  - `describe.each` over `scopes × methods` = 12 combinations asserting `scopePermitsMethod` truth table.

## Acceptance

- [ ] All 7 `verifyBearerToken` branches + 12 `scopePermitsMethod` cases pass.
- [ ] `pnpm --filter @qlm/auth-shared test` is green end-to-end.
- [ ] ≥ 90 % line + branch coverage on `packages/auth-shared/src/`.
- [ ] No test hits a real DB, network, or Supabase client.

## Test plan

```
pnpm --filter @qlm/auth-shared test
pnpm --filter @qlm/auth-shared exec vitest run --coverage --coverage.include='src/*'
```

## Storybook validation

N/A — not a UI task.

## Notes

- The `revoked` vs `expired` ordering test (case 6) documents the precedence decision: revoked beats expired.
- The injected `lookup` mock makes this portable to `qlm-public-api` — same test pattern works there.
- Keep the helpers in-file; no shared fixture file is warranted for a single-file suite.
