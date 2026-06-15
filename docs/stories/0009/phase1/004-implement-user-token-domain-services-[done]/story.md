---
spec: docs/specs/0009-token-management-phase1.md
spec_sections:
  - "#71-domain-packagesdomain"
  - "#31-information-architecture"
  - "#33-user-flows-happy-paths"
  - "#51-data-shapes"
status: done
started: 2026-04-15
finished: 2026-04-16
blocks:
  - "005-implement-supabase-adapter-and-jwt-signer"
  - "006-ship-user-tokens-server-endpoints"
blocked_by:
  - "002-define-user-token-domain-types"
---

# Implement user-token domain services

## Goal

Implement `CreateUserTokenService`, `RevokeUserTokenService`, and `ListUserTokensService` in pure-domain code (`packages/domain/src/services/user-token/`) — each one takes its ports via constructor injection, enforces validation via the Story-002 Zod schemas, and is covered by unit tests against a mocked repository and mocked JWT signer.

## Scope

**In scope**

- `packages/domain/src/services/user-token/create-user-token.usecase.ts` — `CreateUserTokenService` implementing `CreateUserTokenUseCase`. Constructor takes `IUserTokenRepository` and `IJwtSigner`. `execute({ accountId, token_name, scopes, expires_at })`:
  1. Validate input via `CreateUserTokenInputSchema`.
  2. Call `repo.create({ account_id, token_name, scopes, expires_at })` → returns `row: UserToken`.
  3. Call `jwtSigner.sign({ token_id: row.id, sub: row.account_id, scopes: row.scopes, exp: row.expires_at, aud: 'authenticated', role: 'authenticated' }, { secret, algorithm: 'HS256' })` → returns `rawJwt`.
  4. Return `{ row, rawJwt }` matching `CreateUserTokenOutputSchema`.
- `packages/domain/src/services/user-token/revoke-user-token.usecase.ts` — `RevokeUserTokenService`. Constructor takes `IUserTokenRepository`. `execute({ id, accountId })`:
  1. Call `repo.revoke(id, accountId)`.
  2. If null → throw `TokenNotFoundException`.
  3. Return the updated row.
- `packages/domain/src/services/user-token/list-user-tokens.usecase.ts` — `ListUserTokensService`. Constructor takes `IUserTokenRepository`. `execute({ accountId })` → `repo.findByAccountId(accountId)` directly.
- Exports updated in `packages/domain/src/services/index.ts`.
- Vitest tests against mock ports for every service:
  - `create`: validation branches (empty name, empty scopes, past expiration, expiration > 365 d), happy path with JWT claim assertion, repository-throws propagates.
  - `revoke`: happy path, null-from-repo throws `TokenNotFoundException`.
  - `list`: happy path, empty list.

**Out of scope**

- Supabase adapter implementation (→ Story 005).
- Server routes (→ Story 006).
- HTTP adapter (→ Story 008).

## Acceptance criteria

- [x] Each service class takes its ports via constructor injection. No `new SupabaseUserTokenRepository(...)` or `new JwtSigner(...)` inside `packages/domain` — only port types.
- [x] `CreateUserTokenService.execute(...)` validates via `CreateUserTokenInputSchema.parse(...)` before touching the repository. Invalid input throws a Zod error or a domain exception.
- [x] `CreateUserTokenService.execute(...)` passes the EXACT claim shape to `IJwtSigner.sign(...)`: `{ token_id: row.id, sub: row.account_id, scopes: row.scopes, exp: row.expires_at, aud: 'authenticated', role: 'authenticated' }`. A mock assertion verifies this.
- [x] `CreateUserTokenService.execute(...)` returns `{ row, rawJwt }` matching `CreateUserTokenOutputSchema`.
- [x] `RevokeUserTokenService.execute({ id, accountId })` throws `TokenNotFoundException` when repo.revoke returns null.
- [x] `ListUserTokensService.execute({ accountId })` delegates to `repo.findByAccountId(accountId)` unchanged.
- [x] Coverage ≥ 90 % on the three new files (100 % achieved on all three).
- [x] `pnpm --filter @guepard/domain exec vitest run __tests__/services/user-token` passes (14 tests).
- [x] `pnpm --filter @guepard/domain typecheck` passes.
- [x] No `jsonwebtoken`, `@supabase/*`, `react`, or `@tanstack/*` import anywhere in the service files.

## Tasks

1. [001-implement-user-token-services](001-implement-user-token-services-[pending].md) — domain layer. Three services (`CreateUserTokenService`, `RevokeUserTokenService`, `ListUserTokensService`) with constructor-injected ports.
2. [002-cover-user-token-services-with-tests](002-cover-user-token-services-with-tests-[pending].md) — tests. Vitest suites against mock repository + mock JWT signer; JWT claim shape assertion; null-from-repo throws `tokenNotFoundException`.

## Demo / verification

```bash
pnpm --filter @guepard/domain test -- user-token
pnpm --filter @guepard/domain test -- --coverage services/user-token
pnpm --filter @guepard/domain typecheck
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. No deviations.
