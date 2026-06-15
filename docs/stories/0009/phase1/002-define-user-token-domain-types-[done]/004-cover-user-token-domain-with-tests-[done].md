---
story: ./story.md
status: done
layer: tests
files:
  - packages/domain/__tests__/user-token/user-token-scope.schema.test.ts
  - packages/domain/__tests__/user-token/user-token-status.test.ts
  - packages/domain/__tests__/user-token/user-token-schema.test.ts
  - packages/domain/__tests__/user-token/create-user-token-input.schema.test.ts
  - packages/domain/__tests__/user-token/create-user-token-output.schema.test.ts
---

# Cover user-token domain with tests

## Purpose

Ship the Vitest suite that validates every user-token type, schema, and helper produced by tasks 001–003. Hits ≥ 90 % line coverage on the new files and covers the boundary cases the refinement gates on (`now`, `now+1s`, `now+365d`, `now+365d+1s`), the null-revoked normalisation, and the full status-derivation truth table.

## Files

- `packages/domain/__tests__/user-token/user-token-scope.schema.test.ts` — Zod parse tests for every valid scope + a rejection case for an unknown value.
- `packages/domain/__tests__/user-token/user-token-status.test.ts` — truth table for `deriveUserTokenStatus`:
  - `{ revoked: true, expires_at: future }` → `'revoked'`
  - `{ revoked: true, expires_at: past }` → `'revoked'` (revoked wins)
  - `{ revoked: false, expires_at: past }` → `'expired'`
  - `{ revoked: false, expires_at: future }` → `'active'`
  - `{ revoked: false, expires_at: now (equal) }` → `'expired'` (boundary: inclusive)
  - With explicit `nowUnix` parameter for deterministic verification.
- `packages/domain/__tests__/user-token/user-token-schema.test.ts` — `UserTokenSchema`:
  - Valid full row parses cleanly.
  - `revoked: null` parses and yields `revoked: false` (documents the `.nullable().transform` per spec §1 Q5).
  - `revoked: true` and `revoked: false` both parse and round-trip.
  - Missing `account_id` or `token_name` rejects.
  - `token_name` longer than 255 chars rejects.
  - `expires_at` as a float or string rejects.
- `packages/domain/__tests__/user-token/create-user-token-input.schema.test.ts` — refinement boundary coverage:
  - `expires_at = now` → rejects.
  - `expires_at = now + 1` → accepts.
  - `expires_at = now + 365*86400` → accepts (boundary, inclusive).
  - `expires_at = now + 365*86400 + 1` → rejects.
  - Empty `token_name` → rejects.
  - Empty `scopes` → rejects.
  - Unknown scope → rejects.
  - Use Vitest fake timers (`vi.useFakeTimers()` + `vi.setSystemTime(...)`) so the boundary tests are deterministic relative to `Math.floor(Date.now() / 1000)`.
- `packages/domain/__tests__/user-token/create-user-token-output.schema.test.ts` — validates `{ row, rawJwt }` shape; empty `rawJwt` rejects.

## Acceptance

- [ ] All five test files run clean via `pnpm --filter @guepard/domain test -- user-token`.
- [ ] Line coverage on `packages/domain/src/entities/user-token*.ts`, `packages/domain/src/usecases/dto/*user-token*.ts`, and (where applicable) ports, is ≥ 90 %. Measured via `pnpm --filter @guepard/domain test -- --coverage user-token`.
- [ ] Refinement boundary tests use fake timers so they pass deterministically regardless of wall-clock run time.
- [ ] No hitting any real database, network, or third-party library (`jsonwebtoken`, `@supabase/*`, etc.) from any test.
- [ ] `pnpm --filter @guepard/domain test` passes end-to-end (the new tests do not break any existing domain test).
- [ ] `@guepard/domain`'s `package.json` test script runs the new path without config changes — tests are picked up by the existing `__tests__` directory glob.

## Test plan

```
pnpm --filter @guepard/domain typecheck
pnpm --filter @guepard/domain test -- user-token
pnpm --filter @guepard/domain test -- --coverage user-token
# Inspect the coverage output: look for user-token-scope.ts, user-token-status.ts,
# user-token.type.ts, create-user-token.input.ts, create-user-token.output.ts.
# Each should report ≥ 90 % line coverage.
```

## Storybook validation

N/A — not a UI task.

## Notes

- Use `vi.useFakeTimers()` + `vi.setSystemTime(new Date('2026-04-14T00:00:00Z'))` at the top of the refinement-boundary tests so `Math.floor(Date.now() / 1000)` resolves to a known value.
- Don't test the `UserTokenEntity` class shape beyond "`plainToClass(UserTokenEntity, row)` round-trips every field" — that's an integration-ish concern; one sanity test is enough.
- Exceptions (task 002) don't need their own tests — they're thin factories; they get exercised via the services in Story 004 which test via them.
