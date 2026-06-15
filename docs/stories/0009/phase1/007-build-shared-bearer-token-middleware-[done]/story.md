---
spec: docs/specs/0009-token-management-phase1.md
spec_sections:
  - "#74-server-appsserver"
  - "#63-secrets-contract"
status: done
started: 2026-04-16
finished: 2026-04-16
blocks: []
blocked_by:
  - "002-define-user-token-domain-types"
---

# Build shared bearer-token middleware module

## Goal

Build `packages/auth-shared/src/bearer-token-middleware.ts` — a self-contained, framework-agnostic module exporting `verifyBearerToken` and `scopePermitsMethod`, with full unit-test coverage — so `guepard-public-api` can adopt it in a separate cross-repo ticket without re-implementing JWT verification + scope enforcement logic.

## Scope

**In scope**

- New package `packages/auth-shared/` with:
  - `package.json` (`@guepard/auth-shared` or similar name; decided during implementation), `tsconfig.json`, `vitest.config.ts`, `src/index.ts`.
  - Dependencies: `zod` (for validating the JWT payload shape), `jsonwebtoken` (for HS256 verify). No Hono, no Supabase, no React, no framework-specific code.
- `src/bearer-token-middleware.ts` exporting:
  - `verifyBearerToken(authHeader: string | null, jwtSecret: string, lookup: (tokenId: string) => Promise<{ revoked: boolean; expires_at: number } | null>)` → `Promise<{ ok: true; accountId: string; scopes: UserTokenScope[] } | { ok: false; reason: 'no-auth' | 'invalid-signature' | 'not-found' | 'revoked' | 'expired' }>`.
  - `scopePermitsMethod(scopes: UserTokenScope[], method: string): boolean` — `admin` → any; `read` → GET only; `write` → POST/PUT/DELETE only.
  - Small Zod schema for the expected JWT payload shape (`token_id`, `sub`, `scopes`, `exp`) so invalid-shape claims are rejected cleanly.
- The `lookup` dependency is injected — the module does NOT import `@supabase/*` or any DB client. Consumers (v3's server, `guepard-public-api`) pass their own lookup function. This keeps the module portable.
- Re-export from `src/index.ts`.
- Unit tests:
  - Missing `Authorization` header → `{ ok: false, reason: 'no-auth' }`.
  - `Authorization` header not starting with `Bearer ` → `{ ok: false, reason: 'no-auth' }`.
  - Invalid signature → `{ ok: false, reason: 'invalid-signature' }`.
  - Valid signature but lookup returns null → `{ ok: false, reason: 'not-found' }`.
  - `lookup` returns `revoked: true` → `{ ok: false, reason: 'revoked' }`.
  - `lookup` returns `expires_at * 1000 < Date.now()` → `{ ok: false, reason: 'expired' }`.
  - Happy path → `{ ok: true, accountId, scopes }`.
  - `scopePermitsMethod` truth table: all 3 scopes × 4 methods (GET/POST/PUT/DELETE) = 12 cases. Admin always true. Read only on GET. Write only on POST/PUT/DELETE.

**Out of scope**

- Applying the middleware anywhere in v3. Per spec §3.3 Flow C and §7.4, v3 server routes use the session cookie; they do NOT adopt this middleware. This module exists for `guepard-public-api`.
- The actual `guepard-public-api` consumption — tracked cross-repo in spec §7.9 (and referenced by Story 012's coordination checklist).
- Any framework-specific middleware wrapper (e.g. a Hono or Express adapter). Just the pure functions.

## Acceptance criteria

- [x] `packages/auth-shared/` exists with `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `src/bearer-token-middleware.ts`.
- [x] `verifyBearerToken(...)` and `scopePermitsMethod(...)` are exported.
- [x] `verifyBearerToken` takes its DB lookup as a function argument — no runtime import of `@supabase/*` or any DB client in the package.
- [x] `verifyBearerToken` covers all 5 rejection reasons (no-auth, invalid-signature, not-found, revoked, expired) + happy path with passing unit tests (9 cases: the no-auth branch is exercised 3 different ways — null header, non-Bearer scheme, empty token — to pin the normalisation logic).
- [x] `scopePermitsMethod` covers all 12 combinations of `{read, write, admin} × {GET, POST, PUT, DELETE}` with passing unit tests, plus an OR-combine case and a case-insensitive-method case.
- [x] No import of Hono, Express, `@supabase/*`, React, or any framework-specific package in the module files.
- [x] Coverage ≥ 90 % on `src/` (96.42 % line, 95.65 % branch).
- [x] `pnpm --filter @guepard/auth-shared test` passes (23 tests).
- [x] `pnpm --filter @guepard/auth-shared typecheck` passes.

## Tasks

1. [001-scaffold-auth-shared-package](001-scaffold-auth-shared-package-[pending].md) — domain. New `@guepard/auth-shared` workspace package (package.json, tsconfig, vitest.config, empty barrel).
2. [002-implement-bearer-token-middleware](002-implement-bearer-token-middleware-[pending].md) — domain. `verifyBearerToken` + `scopePermitsMethod` + Zod JWT-payload schema.
3. [003-cover-bearer-token-middleware-with-tests](003-cover-bearer-token-middleware-with-tests-[pending].md) — tests. 7 `verifyBearerToken` branches + 12-cell `scopePermitsMethod` matrix.

## Demo / verification

```bash
pnpm --filter @guepard/auth-shared typecheck
pnpm --filter @guepard/auth-shared test
pnpm --filter @guepard/auth-shared test -- --coverage
```

## Questions surfaced

- _(empty)_

## Spec-accuracy check

- [x] The referenced spec sections still match the implementation as shipped. One intentional clarification: the `no-auth` rejection is hit by 3 distinct header conditions (null, non-Bearer prefix, empty-payload Bearer) rather than a single case — a minor strengthening that does not deviate from the spec's "one of 6 branches" contract.
