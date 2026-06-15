---
story: ./story.md
status: pending
layer: domain
files:
  - packages/auth-shared/src/bearer-token-middleware.ts
  - packages/auth-shared/src/index.ts
---

# Implement bearer-token middleware

## Purpose

Implement the two pure functions `verifyBearerToken` and `scopePermitsMethod` plus their Zod JWT-payload schema in `packages/auth-shared/src/bearer-token-middleware.ts`, and re-export from `src/index.ts`.

## Files

- `packages/auth-shared/src/bearer-token-middleware.ts` — contains:
  - Zod schema `BearerJwtPayloadSchema` with `{ token_id, sub, scopes, exp }` — validates the decoded JWT claim.
  - `UserTokenScope` local union type `'read' | 'write' | 'admin'` (copied from domain so this package stays framework-free and has no `@guepard/domain` dep).
  - `VerifyBearerTokenResult` discriminated union `{ ok: true, accountId, scopes } | { ok: false, reason }`.
  - `verifyBearerToken(authHeader, jwtSecret, lookup)`: strips `Bearer `, verifies HS256 via `jsonwebtoken.verify`, parses payload via the Zod schema, calls `lookup(tokenId)`, maps branches to the six rejection reasons + happy path.
  - `scopePermitsMethod(scopes, method)`: `admin` → true; `read` → method === `'GET'`; `write` → method ∈ `{'POST','PUT','DELETE'}`.
- `packages/auth-shared/src/index.ts` — re-exports `verifyBearerToken`, `scopePermitsMethod`, `VerifyBearerTokenResult`, `UserTokenScope`.

## Acceptance

- [ ] `verifyBearerToken` signature matches the story: `(authHeader: string | null, jwtSecret: string, lookup: (tokenId: string) => Promise<{ revoked: boolean; expires_at: number } | null>) => Promise<VerifyBearerTokenResult>`.
- [ ] All six rejection branches are explicit: `no-auth`, `invalid-signature`, `not-found`, `revoked`, `expired`. Invalid JWT payload shape (missing `token_id` etc.) maps to `invalid-signature` so callers don't need an extra branch.
- [ ] `scopePermitsMethod` is pure, synchronous, and handles the full `{read, write, admin} × {GET, POST, PUT, DELETE}` matrix.
- [ ] The module imports ONLY `jsonwebtoken` and `zod` from its runtime deps. No `@supabase/*`, Hono, Express, React, or DB client.
- [ ] `pnpm --filter @guepard/auth-shared typecheck` passes.

## Test plan

```
pnpm --filter @guepard/auth-shared typecheck
```

## Storybook validation

N/A — not a UI task.

## Notes

- `jsonwebtoken.verify` throws on invalid signature — wrap in try/catch and return `{ ok: false, reason: 'invalid-signature' }`.
- Expiry check uses seconds: `lookup.expires_at * 1000 < Date.now()`.
- Revoked check comes before expired so a revoked+expired token reports `revoked` (closer to the user's mental model).
