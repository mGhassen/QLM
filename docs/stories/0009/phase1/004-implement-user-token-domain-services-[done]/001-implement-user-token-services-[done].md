---
story: ./story.md
status: pending
layer: domain
files:
  - packages/domain/src/services/user-token/create-user-token.usecase.ts
  - packages/domain/src/services/user-token/revoke-user-token.usecase.ts
  - packages/domain/src/services/user-token/list-user-tokens.usecase.ts
  - packages/domain/src/services/index.ts
  - packages/domain/src/usecases/index.ts
---

# Implement user-token services

## Purpose

Ship the three domain services (`CreateUserTokenService`, `RevokeUserTokenService`, `ListUserTokensService`) as pure-domain code in `packages/domain/src/services/user-token/`. Each takes its ports via constructor injection; services call Zod schemas from Story 002 for validation and raise domain exceptions on failure. No adapter wiring.

## Files

- `packages/domain/src/services/user-token/create-user-token.usecase.ts` — `CreateUserTokenService`. Constructor: `(repo: IUserTokenRepository, jwtSigner: IJwtSigner, jwtSecret: string)`. `execute(input: { accountId: string } & CreateUserTokenInput)`:
  1. Validate via `CreateUserTokenInputSchema.parse({ token_name, scopes, expires_at })` (throws Zod error on failure — mapped to `tokenExpirationInvalidException` defensively if it's the refinement that fails).
  2. `repo.create({ account_id: input.accountId, token_name, scopes, expires_at })` → `row: UserToken`.
  3. `jwtSigner.sign({ token_id: row.id, sub: row.account_id, scopes: row.scopes, exp: row.expires_at, aud: 'authenticated', role: 'authenticated' }, { secret: jwtSecret, algorithm: 'HS256' })` → `rawJwt`.
  4. Return `{ row, rawJwt }`.
- `packages/domain/src/services/user-token/revoke-user-token.usecase.ts` — `RevokeUserTokenService`. Constructor: `(repo: IUserTokenRepository)`. `execute({ id, accountId })`:
  1. `await repo.revoke(id, accountId)`.
  2. If null → throw `tokenNotFoundException(id)` (caller can disambiguate not-found vs already-revoked via an explicit lookup if needed — but per the spec §3.4 error model, the UI treats either as "revoke failed" and the inline-confirm closes).
  3. Return the updated row.
- `packages/domain/src/services/user-token/list-user-tokens.usecase.ts` — `ListUserTokensService`. Constructor: `(repo: IUserTokenRepository)`. `execute({ accountId })` → `return repo.findByAccountId(accountId);`.
- `packages/domain/src/services/index.ts` — re-export the three services.
- `packages/domain/src/usecases/index.ts` — ensure the services path is transitively re-exported (if not already via `services/index.ts` → check).

## Acceptance

- [ ] Each service class takes its ports via constructor injection — no `new SupabaseUserTokenRepository(...)` / `new JwtSigner(...)` anywhere in `packages/domain`.
- [ ] `CreateUserTokenService.execute(...)` calls `CreateUserTokenInputSchema.parse(...)` before `repo.create(...)` — verified at implementation-time by code inspection.
- [ ] `CreateUserTokenService.execute(...)` passes EXACTLY the claim shape from spec §6.3 to `IJwtSigner.sign(...)`: `{ token_id: row.id, sub: row.account_id, scopes: row.scopes, exp: row.expires_at, aud: 'authenticated', role: 'authenticated' }`.
- [ ] `CreateUserTokenService.execute(...)` returns `{ row, rawJwt }` — structurally matches `CreateUserTokenOutputSchema`.
- [ ] `RevokeUserTokenService.execute({ id, accountId })` throws `tokenNotFoundException(id)` when `repo.revoke` returns null.
- [ ] `ListUserTokensService.execute({ accountId })` delegates to `repo.findByAccountId(accountId)` unchanged.
- [ ] `pnpm --filter @qlm/domain typecheck` passes.
- [ ] No `jsonwebtoken`, `@supabase/*`, `react`, or `@tanstack/*` import anywhere in the new service files.

## Test plan

```
pnpm --filter @qlm/domain typecheck
# Runtime tests ship in task 002 of this story.
```

## Storybook validation

N/A — not a UI task.

## Notes

- Pass `jwtSecret` through the service constructor (not via a module-level env var read) — matches the repo's hexagonal discipline: pure-domain code reads no environment variables.
- The `CreateUserTokenInputSchema` `.refine` already covers the expiration cap, so the service doesn't need to re-check it; trusting the schema keeps the service pure and small.
