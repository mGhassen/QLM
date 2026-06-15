---
story: ./story.md
status: pending
layer: adapter
files:
  - packages/repositories/supabase/src/jwt-signer.ts
  - packages/repositories/supabase/src/index.ts
  - packages/repositories/supabase/package.json
---

# Implement JWT signer

## Purpose

Implement `JwtSigner extends IJwtSigner` that wraps `jsonwebtoken.sign` with HS256. Isolated from the adapter so `@supabase/*` and `jsonwebtoken` stay outside `@qlm/domain`.

## Files

- `packages/repositories/supabase/src/jwt-signer.ts` — `JwtSigner` class. Constructor takes no args. `sign(payload, options)` → `jsonwebtoken.sign(payload, options.secret, { algorithm: options.algorithm })`. No `process.env` access inside the class.
- `packages/repositories/supabase/src/index.ts` — re-export `JwtSigner`.
- `packages/repositories/supabase/package.json` — add `jsonwebtoken` (`^9.0.2`) + `@types/jsonwebtoken` (`^9.0.7`) deps. Shared version with `@qlm/auth-shared`.

## Acceptance

- [ ] `JwtSigner` extends `IJwtSigner` (abstract class).
- [ ] `sign(payload, { secret, algorithm: 'HS256' })` returns a string that `jsonwebtoken.verify(token, secret)` round-trips back to the exact payload.
- [ ] No `process.env.JWT_SECRET` read inside `JwtSigner` — the caller passes the secret via `options.secret`.
- [ ] `pnpm --filter @qlm/repository-supabase typecheck` passes.
- [ ] `pnpm install` picks up the new deps.

## Test plan

```
pnpm install
pnpm --filter @qlm/repository-supabase typecheck
```

## Storybook validation

N/A — not a UI task.

## Notes

- Keep the class stateless (no constructor args, no fields). `IJwtSigner.sign` already takes secret via options — reading it from the class would duplicate the source of truth.
- The `@qlm/auth-shared` package also depends on `jsonwebtoken@^9.0.2` (Story 007); version pinned so sig formats stay identical across the two packages.
