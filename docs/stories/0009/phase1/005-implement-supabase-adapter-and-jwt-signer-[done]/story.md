---
spec: docs/specs/0009-token-management-phase1.md
spec_sections:
  - "#72-adapters-packagesrepositories-and-appswebsrclibrepositories"
  - "#63-secrets-contract"
  - "#6-data-model"
status: done
started: 2026-04-16
finished: 2026-04-16
blocks:
  - "006-ship-user-tokens-server-endpoints"
blocked_by:
  - "004-implement-user-token-domain-services"
---

# Implement Supabase adapter and JWT signer

## Goal

Implement `SupabaseUserTokenRepository` against the existing `public.user_tokens` table and `JwtSigner` using `jsonwebtoken`, then wire both into `apps/server/src/lib/repositories.ts` so the Story-006 server handlers can instantiate domain services with real adapters.

## Scope

**In scope**

- `packages/repositories/supabase/src/user-token.repository.ts` — `SupabaseUserTokenRepository` extending `IUserTokenRepository` from `@qlm/domain/repositories`:
  - `findByAccountId(accountId)` — `SELECT * FROM public.user_tokens WHERE account_id = $accountId ORDER BY created_at DESC`. Returns `UserToken[]` after Zod parse.
  - `create({ account_id, token_name, scopes, expires_at })` — `INSERT INTO public.user_tokens (account_id, token_name, scopes, expires_at) VALUES (...) RETURNING *`. Returns `UserToken` after Zod parse.
  - `revoke(id, accountId)` — `UPDATE public.user_tokens SET revoked = true, revoked_at = now() WHERE id = $id AND account_id = $accountId AND revoked = false RETURNING *`. Returns `UserToken | null` — null when zero rows (unknown id OR already revoked).
  - Column names pass through as-is (no snake ↔ camel renaming needed — the `UserTokenSchema` already uses the snake-case column names).
  - Triggers (`set_user_tokens_timestamps`, `set_user_tokens_user_tracking`) handle `created_at`, `updated_at`, `created_by`, `updated_by` automatically; the adapter does not set them.
- `packages/repositories/supabase/src/jwt-signer.ts` — `JwtSigner` implementing `IJwtSigner` via `jsonwebtoken.sign(payload, secret, { algorithm: 'HS256' })`. Secret is injected via constructor (not read from `process.env` inside the class).
- `packages/repositories/supabase/src/index.ts` — re-export both.
- `apps/server/src/lib/repositories.ts` — extend `getRepositories(c)` (or equivalent factory) to instantiate `SupabaseUserTokenRepository` and `JwtSigner` (with `JWT_SECRET` read once from env at server boot and passed in) and expose them on the returned `Repositories` object.
- Tests using the existing Supabase-mock helper pattern:
  - `findByAccountId`: filters by `account_id` and orders by `created_at desc`.
  - `create`: INSERT SQL + RETURNING, result parsed by `UserTokenSchema`.
  - `revoke`: UPDATE SQL with the correct WHERE clause, null-returning case, already-revoked case.
  - `JwtSigner.sign`: produces a JWT that `jsonwebtoken.verify` accepts with the same secret.

**Out of scope**

- The three HTTP endpoints (→ Story 006).
- HTTP adapter on the browser side (→ Story 008).
- Bearer-token middleware module (→ Story 007).
- Any UI (→ Stories 009–011).

## Acceptance criteria

- [x] `SupabaseUserTokenRepository` extends `IUserTokenRepository` from `@qlm/domain`.
- [x] `findByAccountId` SQL filters by `account_id` and orders by `created_at DESC` — verified by a mock query-call match.
- [x] `create` inserts only the four allowed fields (`account_id`, `token_name`, `scopes`, `expires_at`); triggers own timestamps + tracking — verified by a `not.toHaveProperty` assertion on the insert payload.
- [x] `revoke` UPDATEs with `revoked: true` + `revoked_at: <ISO>`, narrowed by `id` AND `account_id` AND `revoked = false` — three `eq` calls verified.
- [x] `revoke` returns `null` (not throws) when zero rows are affected (`maybeSingle` returns `data: null`).
- [x] `JwtSigner.sign({...}, { secret, algorithm: 'HS256' })` returns a token that `jsonwebtoken.verify(token, secret)` round-trips back to the same payload.
- [x] `apps/server/src/lib/repositories.ts` factory returns a `Repositories` object with `userToken` and `jwtSigner` populated — no casts.
- [x] `JWT_SECRET` is read once via `getJwtSecret()` (cached, validated non-empty); `JwtSigner` itself never reads `process.env`.
- [x] `pnpm --filter @qlm/repository-supabase test` passes (18 tests, 100 % line / 93.75 % branch on new files).
- [x] `pnpm --filter @qlm/repository-supabase typecheck` and `pnpm --filter server typecheck` both pass.

## Tasks

1. [001-implement-supabase-user-token-repository](001-implement-supabase-user-token-repository-[pending].md) — adapter. `SupabaseUserTokenRepository` against `public.user_tokens` with `findByAccountId` / `create` / `revoke` / `findById`.
2. [002-implement-jwt-signer](002-implement-jwt-signer-[pending].md) — adapter. `JwtSigner` wrapping `jsonwebtoken.sign` with HS256; adds `jsonwebtoken` dep to the supabase package.
3. [003-wire-adapters-into-server-factory](003-wire-adapters-into-server-factory-[pending].md) — server. Extend `createRepositories(...)`, read `JWT_SECRET` at boot, surface to routes.
4. [004-cover-adapters-with-tests](004-cover-adapters-with-tests-[pending].md) — tests. Mock Supabase client for the repo + real-`jsonwebtoken` round-trip for the signer.

## Demo / verification

```bash
pnpm --filter @qlm/repository-supabase test -- user-token
pnpm typecheck

# Optional: quick JWT round-trip in a node REPL
# const { JwtSigner } = await import('@qlm/repository-supabase');
# const signer = new JwtSigner('test-secret');
# const jwt = signer.sign({ token_id: 'x', sub: 'y', scopes: ['read'], exp: 0, aud: 'authenticated', role: 'authenticated' }, { secret: 'test-secret', algorithm: 'HS256' });
# const { default: jsonwebtoken } = await import('jsonwebtoken');
# console.log(jsonwebtoken.verify(jwt, 'test-secret'));
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. One adapter-level deviation worth recording: the spec describes `JwtSigner` taking the secret in its constructor (e.g. `new JwtSigner(JWT_SECRET)`), but the domain `IJwtSigner.sign(...)` already takes `secret` via `JwtSignerOptions`. To avoid duplicating the source of truth, `JwtSigner` is stateless and the route layer (story 006) passes `getJwtSecret()` into `new CreateUserTokenService(repo, signer, secret)` instead. Functionally identical; the bind point just shifts one layer up.
