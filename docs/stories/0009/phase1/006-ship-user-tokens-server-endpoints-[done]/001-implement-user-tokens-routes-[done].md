---
story: ./story.md
status: pending
layer: server
files:
  - apps/server/src/routes/user-tokens.ts
  - apps/server/src/lib/current-account.ts
  - apps/server/src/server.ts
---

# Implement user-tokens routes

## Purpose

Wire `POST /user-tokens` (create + sign), `GET /user-tokens` (list), `POST /user-tokens/:id/revoke` (soft revoke) into Hono on `apps/server`, backed by Story-004 services and Story-005 adapters.

## Files

- `apps/server/src/lib/current-account.ts` — small helper `getCurrentAccountId(c, repos)`:
  1. Read the Authorization Bearer token (already extracted by Supabase wiring).
  2. Call `client.auth.getUser()` (via the same supabase client the repositories use) to get `user.id`.
  3. SELECT `id` from `public.accounts WHERE user_id = $auth.uid` — the personal account row id.
  4. Throw a typed `unauthorized` exception (mapped to 401 by `handleDomainException`) when any step fails. The story expects 401 when no session is present.
  Implementation note: the helper takes the supabase client as an argument to avoid a second factory call (the route already has the client via `getRepositories`).
- `apps/server/src/routes/user-tokens.ts` — `createUserTokensRoutes(getRepositories)`:
  - `POST /` — `zValidator('json', CreateUserTokenInputSchema)`, resolve `accountId`, instantiate `CreateUserTokenService(repos.userToken, repos.jwtSigner, getJwtSecret())`, return 201 with `{ row, rawJwt }`.
  - `GET /` — resolve `accountId`, instantiate `ListUserTokensService(repos.userToken)`, return 200 with `UserToken[]`.
  - `POST /:id/revoke` — resolve `accountId`, instantiate `RevokeUserTokenService(repos.userToken)`, return 200 with the updated row. `tokenNotFoundException` (code `USER_TOKEN_NOT_FOUND_ERROR = 3000`) → mapped by `handleError`/`handleDomainException` to 404 (already in the codes-to-status map: 2000-3000 range → 404).
- `apps/server/src/server.ts` — register the new factory at path prefix `/user-tokens`. (No global `/api` prefix — the spec §5.2 paths are root-relative.)

## Acceptance

- [ ] All three routes are registered.
- [ ] `POST /user-tokens` returns 201 with `{ row, rawJwt }` on success.
- [ ] `GET /user-tokens` returns 200 with `UserToken[]`; no `rawJwt` in any row.
- [ ] `POST /user-tokens/:id/revoke` returns 200 with the updated row; unknown id → 404 via `tokenNotFoundException`.
- [ ] All three routes return 401 when no Authorization header is present.
- [ ] `POST /user-tokens` returns 400 (Zod-validator error) for empty `token_name` / empty `scopes` / past `expires_at` / `expires_at > now + 365d`.
- [ ] `pnpm --filter server typecheck` passes.

## Test plan

```
pnpm --filter server typecheck
```

## Storybook validation

N/A — not a UI task.

## Notes

- `getJwtSecret()` from `apps/server/src/lib/repositories.ts` is the cached JWT_SECRET reader from Story 005 task 003.
- `current-account.ts` is intentionally minimal — see story Questions for the broader "centralized current-user middleware" follow-up.
- `rawJwt` log redaction is tracked in story Questions; a centralized logger redaction list does not exist today on apps/server (only `getLogger()` from `@qlm/shared/logger` returns Pino with default config).
