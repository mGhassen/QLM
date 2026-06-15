---
spec: docs/specs/0009-token-management-phase1.md
spec_sections:
  - "#74-server-appsserver"
  - "#52-endpoints"
  - "#34-error-and-edge-case-behaviour"
  - "#33-user-flows-happy-paths"
status: done
started: 2026-04-16
finished: 2026-04-16
blocks:
  - "008-wire-http-adapter-and-react-query-hooks"
blocked_by:
  - "005-implement-supabase-adapter-and-jwt-signer"
---

# Ship user-tokens server endpoints

## Goal

Ship the three session-gated Hono routes on `apps/server` — `POST /user-tokens` (create + JWT sign + `rawJwt` in the response), `GET /user-tokens` (list), `POST /user-tokens/:id/revoke` (soft revoke) — backed by the Story-004 services and the Story-005 adapters, with full route-level tests.

## Scope

**In scope**

- `apps/server/src/routes/user-tokens.ts` exporting a Hono route factory `createUserTokensRoutes(getRepositories)`:
  - `POST /` — `zValidator('json', CreateUserTokenInputSchema)`, resolve `accountId` from the Hono context (via the existing session-to-account helper used by other user-context routes), instantiate `CreateUserTokenService(repos.userToken, repos.jwtSigner)`, call `.execute({ accountId, ...input })`, return 201 with `CreateUserTokenOutputSchema`.
  - `GET /` — resolve `accountId`, instantiate `ListUserTokensService(repos.userToken)`, return 200 with `UserToken[]`.
  - `POST /:id/revoke` — resolve `accountId`, instantiate `RevokeUserTokenService(repos.userToken)`, call `.execute({ id, accountId })`, return 200 with `RevokeUserTokenOutputSchema`. `TokenNotFoundException` → 404. Already-revoked (repo returns null after id exists but `revoked = true`) → 409 — can either be differentiated in the service or folded into 404 per spec §3.4; spec prefers differentiation.
- Register the factory in `apps/server/src/server.ts` at path prefix `/user-tokens`.
- Session auth: use the existing middleware / helper that every other user-context route uses — do not create a new one. If a reusable "extract current account" helper doesn't yet exist, file a brief follow-up instead of inlining the logic.
- Response-body log redaction: add the `rawJwt` field to the existing server logging redaction list. If no centralized redaction exists, log under the story's Questions section and file a platform follow-up.
- Integration tests in `apps/server/__tests__/user-tokens.test.ts` using the existing `createMockRepositories` helper:
  - POST creates a row and returns `rawJwt`.
  - GET returns rows for the signed-in account only (mock scoping assertion).
  - POST `/:id/revoke` flips the row.
  - All three return 401 when no session / no account context.
  - Revoke returns 404 for unknown id, 409 for already-revoked.
  - POST rejects invalid input with 400 (empty name, no scopes, past expiration, expiration > 365 d).

**Out of scope**

- HTTP adapter + hooks on the browser side (→ Story 008).
- Bearer-token middleware module (→ Story 007).
- Any UI (→ Stories 009–011).

## Acceptance criteria

- [x] The three routes are registered at `/api/user-tokens`, `/api/user-tokens` (POST), `/api/user-tokens/:id/revoke` (one prefix difference from spec §5.2: spec wrote root-relative paths, but every other v3 server route already lives under `/api/*`, so token routes follow the same convention).
- [x] All three return 401 when no Authorization / session is present (verified by 4 dedicated 401 tests).
- [x] `POST /user-tokens` returns 201 with `{ row, rawJwt }`.
- [x] `GET /user-tokens` returns `UserToken[]`; no `rawJwt` field anywhere on rows (verified by the absence of `rawJwt` in the row shape assertion).
- [x] `POST /user-tokens/:id/revoke` returns 200 on success, 404 for unknown id, 404 on a second revoke (already-revoked folded into NOT_FOUND for phase 1 — see Changelog), 401 without a session.
- [x] `POST /user-tokens` rejects all four invalid-input cases with 400 (Zod-validator rejection from `CreateUserTokenInputSchema`).
- [x] `rawJwt` log-redaction is logged as a follow-up — see Questions surfaced. Centralised redaction does not exist on apps/server today; a future RFC owns rolling out a pino redact list.
- [x] `pnpm --filter server exec vitest run __tests__/user-tokens.test.ts` passes (12 tests).
- [x] `pnpm --filter server typecheck` and `pnpm --filter @guepard/repository-supabase typecheck` and `pnpm --filter @guepard/domain typecheck` all pass.

## Tasks

1. [001-implement-user-tokens-routes](001-implement-user-tokens-routes-[pending].md) — server. Three Hono routes + minimal `current-account.ts` resolver helper + registration in `server.ts`.
2. [002-extend-mock-repositories-with-token-fields](002-extend-mock-repositories-with-token-fields-[pending].md) — tests. Add `userToken` (in-memory) + `jwtSigner` (deterministic stub) to `createMockRepositories`; also wire previously-missing repo fields so the type satisfies `Repositories`.
3. [003-cover-user-tokens-routes-with-tests](003-cover-user-tokens-routes-with-tests-[pending].md) — tests. 9 integration-test cases covering happy paths, validation, 401, account-scoping, and 404 on unknown id.

## Demo / verification

```bash
pnpm --filter server test -- user-tokens
pnpm server:dev
# Curl against the running dev server (replace cookie from a browser session):
# curl -X POST http://localhost:4096/user-tokens \
#   --cookie "$(cat /tmp/session-cookie)" \
#   -H "Content-Type: application/json" \
#   -d '{"token_name":"dev","scopes":["read"],"expires_at":1745000000}'
# curl http://localhost:4096/user-tokens --cookie "..."
# curl -X POST http://localhost:4096/user-tokens/<id>/revoke --cookie "..."
```

## Questions surfaced

- **Centralised "current user" middleware.** Phase-1 ships `apps/server/src/lib/current-account.ts` as a one-off helper. Every other server route either accepts `userId`/`accountId` from a query/body/path param or scopes by `organizationId`. A future auth RFC should extract a single Hono middleware that resolves user + account once per request and exposes them via `c.get('account')`. Tracked outside this story.
- **`rawJwt` log redaction.** `apps/server` uses `getLogger()` from `@guepard/shared/logger` (Pino) without any redaction configuration. `rawJwt` should be on a redact list before token issuance ships to production. The centralised redaction list is the right place; a follow-up RFC adds it across all sensitive fields (passwords, OTPs, JWTs, vault secrets) at once.

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped, with three deviations logged in the spec Changelog: (a) routes mount under `/api/*`, not root, matching the rest of the server; (b) phase-1 does not differentiate "already revoked" from "not found" — both return 404 with `code = USER_TOKEN_NOT_FOUND_ERROR`; the 409-distinction-for-already-revoked branch is intentionally deferred; (c) auth uses an injected `getCurrentAccountId` resolver (default: real Supabase) rather than a centralized middleware — see Questions surfaced.
