---
story: ./story.md
status: server
layer: server
files:
  - apps/server/src/lib/repositories.ts
  - apps/server/src/server.ts
---

# Wire adapters into server factory

## Purpose

Add `userToken: new SupabaseUserTokenRepository(client)` and `jwtSigner: new JwtSigner()` to `createRepositories(...)` in `apps/server/src/lib/repositories.ts`, read `JWT_SECRET` once at boot in `apps/server/src/server.ts` (or the existing env-loading code path) and surface it so route handlers can pass it into `CreateUserTokenService`.

## Files

- `apps/server/src/lib/repositories.ts` — extend `createRepositories(...)` with the two new fields; update the import list; adjust the return type inference so the resolved `Repositories` object matches the domain contract.
- `apps/server/src/server.ts` — read `process.env.JWT_SECRET` once at boot; throw a clear error if missing (`"JWT_SECRET must be set"`) so misconfiguration fails fast instead of breaking at the first token-create call. Export / stash the value where the token routes (Story 006) can access it — the simplest shape is a module-level `const JWT_SECRET = ...` and a helper exported alongside `getRepositories`.

## Acceptance

- [ ] `createRepositories(client)` returns every field declared in `Repositories` (no `as unknown as` casts).
- [ ] `JWT_SECRET` is read exactly once at server boot, validated non-empty, and surfaced to the token routes.
- [ ] `pnpm --filter server typecheck` passes.
- [ ] `pnpm --filter server test` passes (existing suites continue to run; no new tests required in this task — Story 006 adds token-route tests).
- [ ] `pnpm typecheck` at the repo root shows a net reduction in errors vs. Story 002's baseline (the `Property 'userToken' is missing` / `Property 'jwtSigner' is missing` errors should be gone).

## Test plan

```
pnpm --filter server typecheck
pnpm --filter server test
pnpm typecheck
```

## Storybook validation

N/A — not a UI task.

## Notes

- `JWT_SECRET` was noted in Story 001's spec-accuracy check as "resolved in Story 005" — this task is where that lands.
- `JwtSigner` has no constructor args; `new JwtSigner()` is enough.
- The route layer (Story 006) is what passes `JWT_SECRET` into `new CreateUserTokenService(repo, jwtSigner, secret)`.
